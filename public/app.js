const messageElement = document.getElementById('message');
const welcomeText = document.getElementById('welcomeText');
const logoutBtn = document.getElementById('logoutBtn');
const createTournamentForm = document.getElementById('createTournamentForm');
const tournamentList = document.getElementById('tournamentList');
const bracketContainer = document.getElementById('bracket');
const selectedTournamentTitle = document.getElementById('selectedTournamentTitle');
const gameTypeInput = document.getElementById('gameType');
const tournamentFormatInput = document.getElementById('tournamentFormat');
const joinDeadlineInput = document.getElementById('joinDeadline');
const startAtInput = document.getElementById('startAt');
const matchDurationInput = document.getElementById('matchDurationMinutes');
const breakMinutesInput = document.getElementById('breakMinutes');
const maxParticipantsInput = document.getElementById('maxParticipants');
const seedDemoBtn = document.getElementById('seedDemoBtn');

let currentUser = null;
let authReady = false;
let selectedTournamentId = null;
let cachedTournaments = {};
let tournamentListenerActive = false;
let firebaseReady = false;

// Ensure Firebase is ready before using it
function waitForFirebase() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const checkInterval = setInterval(() => {
      if (window.auth && window.db && firebase.apps.length > 0) {
        clearInterval(checkInterval);
        console.log('[App] Firebase ready: auth, db, and app initialized');
        firebaseReady = true;
        resolve();
      } else if (attempts > 100) {
        clearInterval(checkInterval);
        reject(new Error('Firebase failed to initialize after 10 seconds'));
      }
      attempts++;
    }, 100);
  });
}

// Start Firebase initialization immediately
waitForFirebase()
  .then(() => {
    console.log('[App] Firebase ready, setting up auth listener');
    // Now set up the auth state listener
    window.auth.onAuthStateChanged((user) => {
      console.log('[Auth] Auth state changed:', user ? `User: ${user.email}` : 'No user');
      authReady = true;

      if (!user) {
        console.log('[Auth] No user, redirecting to login');
        window.location.replace('index.html');
        return;
      }

      currentUser = user;
      welcomeText.textContent = `Welcome, ${user.email}`;
      console.log('[Auth] User authenticated, setting up tournament listener for user:', user.uid);

      if (!window.db) {
        console.error('[Auth] Database not available');
        setMessage('Database unavailable. Please refresh the page.', 'error');
        return;
      }

      // Remove previous listener if it exists
      if (tournamentListenerActive) {
        console.log('[Auth] Removing previous tournament listener');
        window.db.ref('tournaments').off('value');
      }

      // Set up tournament listener
      console.log('[Auth] Setting up tournament listener on /tournaments');
      window.db.ref('tournaments').on('value', (snapshot) => {
        console.log('[Listener] Tournament snapshot received');
        cachedTournaments = snapshot.val() || {};
        console.log('[Listener] Tournaments data keys:', Object.keys(cachedTournaments));
        console.log('[Listener] Full tournaments object:', cachedTournaments);
        renderTournaments(cachedTournaments);
        repairLegacyTournaments();
        tournamentListenerActive = true;
      }, (error) => {
        console.error('[Listener] Error listening to tournaments:', error);
        setMessage(mapFirebaseError(error), 'error');
      });
    });
  })
  .catch(error => {
    console.error('[App] Firebase initialization failed:', error);
    setMessage('Firebase failed to load. Please refresh the page.', 'error');
  });

function setMessage(text, type = '') {
  messageElement.textContent = text;
  messageElement.className = `message ${type}`.trim();
}

function safeDisplayNameFromEmail(email) {
  return (email || 'Player').split('@')[0].slice(0, 24);
}

function sanitizeTournamentName(input) {
  const cleaned = (input || '').replace(/[^a-zA-Z0-9 _\-]/g, '').trim();
  return cleaned;
}

function mapFirebaseError(error) {
  const message = (error && (error.message || error.code)) || 'Unknown error';
  if (error && error.code === 'PERMISSION_DENIED') {
    return 'Permission denied. Deploy latest rules with: npx firebase-tools deploy --only database';
  }
  if (typeof message === 'string' && message.toLowerCase().includes('app check')) {
    return 'App Check token missing/invalid. Add appCheckSiteKey in firebase-config.js and register your web app in Firebase App Check.';
  }
  return `${message}${error && error.code ? ` (code: ${error.code})` : ''}`;
}

function isValidTournamentRecord(tournament) {
  return tournament
    && typeof tournament === 'object'
    && typeof tournament.name === 'string'
    && tournament.name.length >= 3;
}

function getValidTournaments(tournaments) {
  return Object.entries(tournaments || {}).filter(([, tournament]) => isValidTournamentRecord(tournament));
}

function toTimestamp(inputValue) {
  if (!inputValue) {
    return null;
  }
  const value = new Date(inputValue).getTime();
  return Number.isFinite(value) ? value : null;
}

function formatDate(timestamp) {
  if (!timestamp) {
    return 'TBD';
  }
  return new Date(timestamp).toLocaleString();
}

function normalizeTournament(tournament) {
  return {
    name: tournament.name,
    ownerUid: tournament.ownerUid || null,
    createdAt: tournament.createdAt || null,
    gameType: tournament.gameType || 'esports',
    format: tournament.format || 'knockout',
    joinDeadline: tournament.joinDeadline || null,
    startAt: tournament.startAt || null,
    matchDurationMinutes: Number(tournament.matchDurationMinutes || 30),
    breakMinutes: Number(tournament.breakMinutes || 10),
    maxParticipants: Number(tournament.maxParticipants || 8),
    participants: tournament.participants || {},
    seedTeams: Array.isArray(tournament.seedTeams) ? tournament.seedTeams : []
  };
}

async function ensureTournamentCoreFields(tournamentId, tournamentRecord) {
  if (!currentUser || !window.db || !tournamentId || !tournamentRecord || typeof tournamentRecord !== 'object') {
    return tournamentRecord;
  }

  const updates = {};
  if (!tournamentRecord.createdAt) {
    updates.createdAt = Date.now();
  }
  if (!tournamentRecord.participants || typeof tournamentRecord.participants !== 'object') {
    updates.participants = {};
  }

  if (Object.keys(updates).length === 0) {
    return tournamentRecord;
  }

  await window.db.ref(`tournaments/${tournamentId}`).update(updates);
  return {
    ...tournamentRecord,
    ...updates
  };
}

async function repairLegacyTournaments() {
  const entries = Object.entries(cachedTournaments || {});
  if (!entries.length || !currentUser || !window.db) {
    return;
  }

  const repairs = [];
  for (const [id, tournament] of entries) {
    if (!isValidTournamentRecord(tournament)) {
      continue;
    }
    const missingOwner = !tournament.ownerUid;
    const missingCreatedAt = !tournament.createdAt;
    const badParticipants = !tournament.participants || typeof tournament.participants !== 'object';
    if (missingOwner || missingCreatedAt || badParticipants) {
      repairs.push(ensureTournamentCoreFields(id, tournament));
    }
  }

  if (!repairs.length) {
    return;
  }

  try {
    await Promise.all(repairs);
    console.log(`[Repair] Repaired ${repairs.length} legacy tournament records`);
  } catch (error) {
    console.warn('[Repair] Failed to repair some tournaments:', error);
  }
}

function getTournamentTeams(tournament) {
  const participantNames = Object.values(tournament.participants || {})
    .map((participant) => participant.displayName)
    .filter(Boolean);
  const combined = [...participantNames, ...(tournament.seedTeams || [])]
    .map((name) => sanitizeTournamentName(name))
    .filter((name) => name.length >= 2);
  return [...new Set(combined)].slice(0, tournament.maxParticipants || 64);
}

function makePairs(players) {
  const pairs = [];
  for (let i = 0; i < players.length; i += 2) {
    pairs.push([players[i], players[i + 1] || 'BYE']);
  }
  return pairs;
}

function generateKnockoutFixtures(teams) {
  return makePairs(teams).map((pair, index) => ({
    label: `Knockout Match ${index + 1}`,
    teamA: pair[0],
    teamB: pair[1]
  }));
}

function generateRoundRobinFixtures(teams) {
  const fixtures = [];
  let matchNo = 1;
  for (let i = 0; i < teams.length; i += 1) {
    for (let j = i + 1; j < teams.length; j += 1) {
      fixtures.push({
        label: `League Match ${matchNo}`,
        teamA: teams[i],
        teamB: teams[j]
      });
      matchNo += 1;
    }
  }
  return fixtures;
}

function generateLeagueKnockoutFixtures(teams) {
  const leagueFixtures = generateRoundRobinFixtures(teams);
  leagueFixtures.push({
    label: 'Final (Top 2 after league)',
    teamA: 'TBD #1',
    teamB: 'TBD #2'
  });
  return leagueFixtures;
}

function scheduleFixtures(fixtures, tournament) {
  const baseTime = tournament.startAt || null;
  const matchDuration = Number(tournament.matchDurationMinutes || 30);
  const breakMinutes = Number(tournament.breakMinutes || 10);
  return fixtures.map((fixture, index) => {
    const scheduledAt = baseTime
      ? baseTime + (index * (matchDuration + breakMinutes) * 60 * 1000)
      : null;
    return {
      ...fixture,
      scheduledAt
    };
  });
}

function buildFixtures(tournament) {
  const teams = getTournamentTeams(tournament);
  if (teams.length < 2) {
    return [];
  }

  let fixtures = [];
  if (tournament.format === 'round_robin') {
    fixtures = generateRoundRobinFixtures(teams);
  } else if (tournament.format === 'league_knockout') {
    fixtures = generateLeagueKnockoutFixtures(teams);
  } else {
    fixtures = generateKnockoutFixtures(teams);
  }

  return scheduleFixtures(fixtures, tournament);
}

function renderBracket(tournaments) {
  bracketContainer.innerHTML = '';

  const validEntries = getValidTournaments(tournaments);
  if (validEntries.length === 0) {
    selectedTournamentTitle.textContent = 'Fixtures Preview';
    bracketContainer.textContent = 'No tournament data yet.';
    return;
  }

  if (!selectedTournamentId || !tournaments[selectedTournamentId] || !isValidTournamentRecord(tournaments[selectedTournamentId])) {
    selectedTournamentId = validEntries[0][0];
  }

  const tournamentRecord = tournaments[selectedTournamentId];
  const tournament = normalizeTournament(tournamentRecord);
  selectedTournamentTitle.textContent = `Fixtures Preview • ${tournament.name}`;

  const fixtures = buildFixtures(tournament);

  if (fixtures.length === 0) {
    bracketContainer.textContent = 'Need at least 2 participants/teams for fixtures.';
    return;
  }

  fixtures.forEach((fixture) => {
    const match = document.createElement('div');
    match.className = 'match';

    const label = document.createElement('strong');
    label.textContent = fixture.label;

    const teamA = document.createElement('div');
    teamA.className = 'match-team';
    teamA.textContent = fixture.teamA;

    const teamB = document.createElement('div');
    teamB.className = 'match-team';
    teamB.textContent = fixture.teamB;

    const time = document.createElement('small');
    time.textContent = `Starts: ${formatDate(fixture.scheduledAt)}`;

    match.appendChild(label);
    match.appendChild(teamA);
    match.appendChild(teamB);
    match.appendChild(time);
    bracketContainer.appendChild(match);
  });
}

function renderTournaments(tournaments) {
  console.log('[Render] Tournaments data:', tournaments);
  tournamentList.innerHTML = '';
  const entries = getValidTournaments(tournaments);
  
  console.log(`[Render] Valid tournaments after filtering: ${entries.length} out of ${Object.keys(tournaments || {}).length}`);

  if (entries.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'list-item';
    empty.textContent = 'No tournaments yet. Create one to get started.';
    tournamentList.appendChild(empty);
    renderBracket({});
    return;
  }

  entries.forEach(([id, tournament]) => {
    const normalized = normalizeTournament(tournament);
    const item = document.createElement('li');
    item.className = 'list-item';

    const info = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = normalized.name || 'Unnamed Tournament';
    const meta = document.createElement('small');
    const participantCount = normalized.participants ? Object.keys(normalized.participants).length : 0;
    const isAlreadyJoined = !!(currentUser && normalized.participants && normalized.participants[currentUser.uid]);
    const isJoinClosed = !!(normalized.joinDeadline && Date.now() > normalized.joinDeadline);
    const isFull = !isAlreadyJoined && participantCount >= normalized.maxParticipants;
    const joinStateLabel = isAlreadyJoined
      ? 'Joined'
      : (isJoinClosed ? 'Closed' : (isFull ? 'Full' : 'Open'));
    const joinDeadlineLabel = normalized.joinDeadline ? `Join by: ${formatDate(normalized.joinDeadline)}` : 'Join anytime';
    meta.textContent = `ID: ${id} • ${normalized.gameType} • ${normalized.format} • Players: ${participantCount}/${normalized.maxParticipants} • ${joinDeadlineLabel} • Status: ${joinStateLabel}`;

    info.appendChild(title);
    info.appendChild(document.createElement('br'));
    info.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'button-row';

    const joinButton = document.createElement('button');
    joinButton.type = 'button';
    joinButton.className = 'btn btn-secondary';
    joinButton.textContent = isAlreadyJoined ? 'Joined' : 'Join';
    joinButton.disabled = isAlreadyJoined || isJoinClosed || isFull;
    joinButton.addEventListener('click', async () => {
      if (!currentUser) {
        setMessage('You must be logged in.', 'error');
        return;
      }

      const displayName = safeDisplayNameFromEmail(currentUser.email);

      try {
        console.log(`[Join] Joining tournament ${id} for user ${currentUser.uid} with displayName ${displayName}`);
        let blockedReason = '';

        const result = await window.db.ref(`tournaments/${id}`).transaction((currentData) => {
          console.log(`[Join] Transaction reading current tournament data, exists: ${!!currentData}`);
          
          if (!currentData || !isValidTournamentRecord(currentData)) {
            blockedReason = 'Tournament no longer exists.';
            console.log('[Join] Blocked: tournament invalid or missing');
            return;
          }

          const repaired = {
            ...currentData,
            createdAt: currentData.createdAt || Date.now(),
            participants: (currentData.participants && typeof currentData.participants === 'object')
              ? currentData.participants
              : {}
          };

          const liveJoinDeadline = repaired.joinDeadline || null;
          if (liveJoinDeadline && Date.now() > liveJoinDeadline) {
            blockedReason = 'Join window is closed for this tournament.';
            console.log('[Join] Blocked: join deadline passed');
            return;
          }

          if (repaired.participants[currentUser.uid]) {
            blockedReason = 'You already joined this tournament.';
            console.log('[Join] Blocked: user already in participants list');
            return;
          }

          const liveMaxParticipants = Number(repaired.maxParticipants || 8);
          const liveParticipantCount = Object.keys(repaired.participants).length;
          console.log(`[Join] Current participants: ${liveParticipantCount}/${liveMaxParticipants}`);
          
          if (liveParticipantCount >= liveMaxParticipants) {
            blockedReason = 'Tournament is full.';
            console.log('[Join] Blocked: tournament full');
            return;
          }

          const newParticipant = {
            uid: currentUser.uid,
            displayName,
            joinedAt: Date.now()
          };
          console.log('[Join] Creating participant record:', newParticipant);

          return {
            ...repaired,
            participants: {
              ...repaired.participants,
              [currentUser.uid]: newParticipant
            }
          };
        });

        console.log(`[Join] Transaction result - committed: ${result.committed}, snapshot: ${!!result.snapshot}`);
        
        if (!result.committed) {
          console.error(`[Join] Transaction failed with reason: ${blockedReason}`);
          setMessage(blockedReason || 'Unable to join this tournament.', 'error');
          return;
        }

        setMessage(`Joined ${normalized.name}.`, 'success');
      } catch (error) {
        console.error('[Join] Error:', error);
        setMessage(mapFirebaseError(error), 'error');
      }
    });

    const viewButton = document.createElement('button');
    viewButton.type = 'button';
    viewButton.className = 'btn';
    viewButton.textContent = 'View Fixtures';
    viewButton.addEventListener('click', () => {
      selectedTournamentId = id;
      renderBracket(cachedTournaments);
    });

    actions.appendChild(joinButton);
    actions.appendChild(viewButton);

    item.appendChild(info);
    item.appendChild(actions);
    tournamentList.appendChild(item);
  });

  renderBracket(tournaments);
}

function getRecommendedFormat(gameType) {
  if (gameType === 'cricket_t20') {
    return 'league_knockout';
  }
  if (gameType === 'fifa') {
    return 'knockout';
  }
  if (gameType === 'baseball') {
    return 'round_robin';
  }
  return 'knockout';
}

function buildTournamentPayload(name) {
  const gameType = gameTypeInput.value;
  const format = tournamentFormatInput.value;
  const joinDeadline = toTimestamp(joinDeadlineInput.value);
  const startAt = toTimestamp(startAtInput.value);
  const matchDurationMinutes = Math.max(10, Math.min(240, Number(matchDurationInput.value || 30)));
  const breakMinutes = Math.max(0, Math.min(120, Number(breakMinutesInput.value || 10)));
  const maxParticipants = Math.max(2, Math.min(64, Number(maxParticipantsInput.value || 8)));

  return {
    name,
    ownerUid: currentUser.uid,
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    gameType,
    format,
    matchDurationMinutes,
    breakMinutes,
    maxParticipants,
    ...(joinDeadline ? { joinDeadline } : {}),
    ...(startAt ? { startAt } : {}),
    participants: {
      [currentUser.uid]: {
        uid: currentUser.uid,
        displayName: safeDisplayNameFromEmail(currentUser.email),
        joinedAt: firebase.database.ServerValue.TIMESTAMP
      }
    }
  };
}

async function seedDemoTournaments() {
  if (!currentUser) {
    setMessage('Please login first.', 'error');
    return;
  }

  if (!window.db) {
    setMessage('Database not ready. Please refresh the page.', 'error');
    return;
  }

  const now = Date.now();
  const sharedEsportsTeams = ['Falcons', 'Dragons', 'Titans', 'Vikings', 'Ravens', 'Panthers', 'Sharks', 'Wolves', 'Knights', 'Blaze', 'Orbit', 'Nova'];
  const sharedFootballTeams = ['Brazil', 'Argentina', 'France', 'Germany', 'Spain', 'Portugal', 'Japan', 'USA', 'Netherlands', 'Belgium', 'Croatia', 'Mexico'];
  const sharedCricketTeams = ['India', 'Australia', 'England', 'Pakistan', 'SouthAfrica', 'NewZealand', 'SriLanka', 'Afghanistan', 'Bangladesh', 'WestIndies'];
  const sharedBaseballTeams = ['Yankees', 'Dodgers', 'Mets', 'Giants', 'Cubs', 'RedSox', 'Astros', 'Braves'];
  const demoTournaments = {
    demo_cricket: {
      name: 'Cricket T20 Winter League',
      gameType: 'cricket_t20',
      format: 'league_knockout',
      joinDeadline: now + (24 * 60 * 60 * 1000),
      startAt: now + (48 * 60 * 60 * 1000),
      matchDurationMinutes: 180,
      breakMinutes: 30,
      maxParticipants: 10,
      seedTeams: sharedCricketTeams
    },
    demo_fifa: {
      name: 'FIFA World Cup Community',
      gameType: 'fifa',
      format: 'knockout',
      joinDeadline: now + (12 * 60 * 60 * 1000),
      startAt: now + (36 * 60 * 60 * 1000),
      matchDurationMinutes: 25,
      breakMinutes: 10,
      maxParticipants: 16,
      seedTeams: sharedFootballTeams
    },
    demo_baseball: {
      name: 'Weekend Baseball Circuit',
      gameType: 'baseball',
      format: 'round_robin',
      joinDeadline: now + (18 * 60 * 60 * 1000),
      startAt: now + (60 * 60 * 1000),
      matchDurationMinutes: 120,
      breakMinutes: 20,
      maxParticipants: 8,
      seedTeams: sharedBaseballTeams
    },
    demo_valorant: {
      name: 'Valorant Night League',
      gameType: 'esports',
      format: 'round_robin',
      joinDeadline: now + (8 * 60 * 60 * 1000),
      startAt: now + (10 * 60 * 60 * 1000),
      matchDurationMinutes: 45,
      breakMinutes: 10,
      maxParticipants: 10,
      seedTeams: ['Sentinels', 'PaperRex', 'Fnatic', 'PRX-Academy', 'G2', 'EDward', 'GenG', 'NRG', 'Liquid', 'Karmine']
    },
    demo_pubg: {
      name: 'PUBG Weekend Scrims',
      gameType: 'esports',
      format: 'knockout',
      joinDeadline: now + (14 * 60 * 60 * 1000),
      startAt: now + (20 * 60 * 60 * 1000),
      matchDurationMinutes: 35,
      breakMinutes: 8,
      maxParticipants: 12,
      seedTeams: ['SquadAlpha', 'SquadBravo', 'SquadCharlie', 'SquadDelta', 'SquadEcho', 'SquadFoxtrot', 'SquadGamma', 'SquadHelix', 'SquadIon', 'SquadJade', 'SquadKilo', 'SquadLuna']
    },
    demo_cs2: {
      name: 'CS2 Pro Mix Cup',
      gameType: 'esports',
      format: 'league_knockout',
      joinDeadline: now + (6 * 60 * 60 * 1000),
      startAt: now + (16 * 60 * 60 * 1000),
      matchDurationMinutes: 50,
      breakMinutes: 15,
      maxParticipants: 8,
      seedTeams: ['Navi', 'Vitality', 'Spirit', 'Faze', 'MOUZ', 'Heroic', 'Cloud9', 'ENCE']
    },
    demo_weekend_open: {
      name: 'Weekend Open Battle',
      gameType: 'esports',
      format: 'knockout',
      joinDeadline: now + (30 * 60 * 60 * 1000),
      startAt: now + (54 * 60 * 60 * 1000),
      matchDurationMinutes: 30,
      breakMinutes: 10,
      maxParticipants: 16,
      seedTeams: sharedEsportsTeams
    }
  };

  try {
    console.log('[Demo] Starting to seed demo tournaments...');
    for (const [demoId, tournament] of Object.entries(demoTournaments)) {
      console.log(`[Demo] Writing: ${demoId} (${tournament.name})`);
      await window.db.ref(`tournaments/${demoId}`).set({
        ...tournament,
        ownerUid: currentUser.uid,
        createdAt: Date.now(),
        participants: {
          [currentUser.uid]: {
            uid: currentUser.uid,
            displayName: safeDisplayNameFromEmail(currentUser.email),
            joinedAt: Date.now()
          }
        }
      });
    }
    console.log('[Demo] All demo tournaments created successfully');
    setMessage('7 demo tournaments loaded with seeded players. Select a tournament and open View Fixtures.', 'success');
  } catch (error) {
    console.error('[Demo] Error creating demo tournaments:', error);
    setMessage(mapFirebaseError(error), 'error');
  }
}

gameTypeInput.addEventListener('change', () => {
  tournamentFormatInput.value = getRecommendedFormat(gameTypeInput.value);
});

seedDemoBtn.addEventListener('click', seedDemoTournaments);

createTournamentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  
  if (!window.db) {
    setMessage('Database not ready. Please refresh the page.', 'error');
    return;
  }

  if (!authReady) {
    setMessage('Still loading your session. Please try again in a moment.', 'error');
    return;
  }

  if (!currentUser) {
    setMessage('Please login first.', 'error');
    return;
  }

  const nameInput = document.getElementById('tournamentName');
  const name = sanitizeTournamentName(nameInput.value);

  if (name.length < 3) {
    setMessage('Tournament name must be at least 3 valid characters (letters, numbers, spaces, - or _).', 'error');
    return;
  }

  try {
    console.log(`[Create] Creating tournament: ${name} for user ${currentUser.uid}`);
    const payload = buildTournamentPayload(name);
    console.log('[Create] Payload:', payload);
    await window.db.ref('tournaments').push(payload);

    nameInput.value = '';
    setMessage('Tournament created.', 'success');
  } catch (error) {
    console.error('[Create] Error:', error);
    setMessage(mapFirebaseError(error), 'error');
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    console.log('[Logout] Logging out user');
    await window.auth.signOut();
    window.location.replace('index.html');
  } catch (error) {
    console.error('[Logout] Error:', error);
    setMessage(error.message, 'error');
  }
});

// Auth state listener is now set up in waitForFirebase() promise chain above
// to ensure Firebase is fully initialized before setting up the listener

