
import { doc, setDoc, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

let screenHistory = [];

function showScreen(screenId, trackHistory = true) {
    if (trackHistory) {
        const currentActive = document.querySelector('.screen.active');
        if (currentActive && currentActive.id !== screenId) {
            screenHistory.push(currentActive.id);
        }
    }
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function goBack() {
    const previous = screenHistory.pop();
    if (previous) {
        showScreen(previous, false);
    } else {
        showScreen('screen-home', false);
    }
}

window.showScreen = showScreen;
window.goBack = goBack;



const myRole = getMyRole();
if (!myRole) {
    showScreen('screen-role-select');
}


function getMyRole() {
    return localStorage.getItem('dingRole');

}


function setMyRole(role) {
    localStorage.setItem('dingRole', role);
}

const roleMumBtn = document.getElementById('role-mum-btn');
const roleEmilyBtn = document.getElementById('role-emily-btn');

if (roleMumBtn) {
    roleMumBtn.addEventListener('click', () => {
        console.log("mum button clicked");
        setMyRole('mum');
        showScreen('screen-home');
        setupNotifications();
    });
}

if (roleEmilyBtn) {
    roleEmilyBtn.addEventListener('click', async () => {
        console.log("emily button clicked");
        setMyRole('emily');
        setupNotifications();
        const snapshot = await getDoc(responseRef);
        if (snapshot.exists()) {
            routeEmily(snapshot.data());
        } else {
            showScreen('screen-emily-waiting');
        }
        
    });
}

const nudgeBtn = document.getElementById('nudge-btn');
const nudgeConfirm = document.getElementById('nudge-confirm');

if (nudgeBtn) {
    nudgeBtn.addEventListener('click', async () => {
        await setDoc(responseRef, { nudgeSent: true }, { merge: true });
        nudgeConfirm.textContent = "Nudge sent!";
    });
}



function formatTime12Hour(time24) {
    if (!time24) return null;
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'pm' : 'am';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes}${period}`;
}

function getTodayDateString() {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

async function logEvent(text) {
    const currentDoc = await getDoc(responseRef);
    const existingEvents = currentDoc.exists() && currentDoc.data().events ? currentDoc.data().events : [];
    const newEvent = { text, time: new Date().toISOString() };
    await setDoc(responseRef, { events: [...existingEvents, newEvent] }, { merge: true });
}

const responseRef = doc(window.db, "responses", "tonight");
const mealListRef = doc(window.db, "settings", "mealList");
const yesButton = document.getElementById('invite-yes-btn');
const noButton = document.getElementById('invite-no-btn');
const statusLine = document.querySelector('.status-line');
const sendInviteBtn = document.getElementById('send-invite-btn');
const timeWindowStart = document.getElementById('time-window-start');
const timeWindowEnd = document.getElementById('time-window-end');


let mealList = [];
let mealPickLimit = 1;
let selectedMeals = [];

const mealOptionsList = document.getElementById('meal-options-list');
const mealListHeading = document.getElementById('meal-list-heading');
const backToMealControls = document.getElementById('back-to-meal-controls');
const sendMealBtn = document.getElementById('send-meal-btn');

function renderMealList() {
    mealOptionsList.innerHTML = '';
    mealList.forEach(meal => {
        const item = document.createElement('button');
        item.className = 'option-card';
        item.textContent = meal;
        if (selectedMeals.includes(meal)) {
            item.style.border = '2px solid var(--primary)';
        }
        item.addEventListener('click', () => {
            if (selectedMeals.includes(meal)) {
                selectedMeals = selectedMeals.filter(m => m !== meal);
            } else if (selectedMeals.length < mealPickLimit) {
                selectedMeals.push(meal);
            } else if (mealPickLimit === 1) {
                selectedMeals = [meal];
            }
            renderMealList();
        });
        mealOptionsList.appendChild(item);
    });
}

function openMealList(limit, heading) {
    mealPickLimit = limit;
    selectedMeals = [];
    mealListHeading.textContent = heading;
    renderMealList();
    showScreen('screen-meal-list');
}

const optionOneMeal = document.getElementById('option-one-meal');
const optionThreeMeals = document.getElementById('option-three-meals');
const optionAsk = document.getElementById('option-ask');

if (optionOneMeal) optionOneMeal.addEventListener('click', () => openMealList(1, "What are you making?"));
if (optionThreeMeals) optionThreeMeals.addEventListener('click', () => openMealList(3, "Pick up to 3 options"));

if (backToMealControls) {
    backToMealControls.addEventListener('click', () => goBack());
}

if (sendMealBtn) {
    sendMealBtn.addEventListener('click', async () => {
        await setDoc(responseRef, {
            mealOptions: selectedMeals,
            mealDecided: false,
            mealAccepted: null,
            preferenceSubmitted: false,
            noPreference: false
        }, { merge: true });
        if (mealPickLimit === 1) {
            await logEvent(`Mum sent one meal: ${selectedMeals[0]}`);
        } else {
            await logEvent(`Mum sent ${selectedMeals.length} options: ${selectedMeals.join(', ')}`);
        }
        showScreen('screen-home');
    });
}


const mealCheckName = document.getElementById('meal-check-name');
const mealYesBtn = document.getElementById('meal-yes-btn');
const mealNoBtn = document.getElementById('meal-no-btn');

if (mealYesBtn) {
    mealYesBtn.addEventListener('click', async () => {
        await setDoc(responseRef, { mealDecided: true, mealAccepted: true }, { merge: true });
        await logEvent("Meal confirmed for tonight");
    });
}

if (mealNoBtn) {
    mealNoBtn.addEventListener('click', async () => {
    
        showScreen('screen-reason');
    });
}

const reasonInput = document.getElementById('reason-input');
const sendReasonBtn = document.getElementById('send-reason-btn');

if (sendReasonBtn) {
    sendReasonBtn.addEventListener('click', async () => {
        const reason = reasonInput.value || "No reason given";
        await setDoc(responseRef, { mealAccepted: false, mealReason: reason }, { merge: true });
        await logEvent(`Emily said no — "${reason}"`);
    });
}

const keepMealBtn = document.getElementById('keep-meal-btn');
const changeMealBtn = document.getElementById('change-meal-btn');
const optoutSortBtn = document.getElementById('optout-sort-btn');
const optoutEatBtn = document.getElementById('optout-eat-btn');

if (keepMealBtn) {
    keepMealBtn.addEventListener('click', async () => {
        await setDoc(responseRef, { mealKept: true }, { merge: true });
        await logEvent("Mum decided to keep the meal as is");
    });
}

if (changeMealBtn) {
    changeMealBtn.addEventListener('click', () => {
        openMealList(3, "Pick up to 3 options");
    });
}

if (optoutSortBtn) {
    optoutSortBtn.addEventListener('click', async () => {
        await setDoc(responseRef, { mealOptOut: true, mealDecided: true }, { merge: true });
        await logEvent("Emily opted to sort herself out for the meal");
    });
}

if (optoutEatBtn) {
    optoutEatBtn.addEventListener('click', async () => {
        await setDoc(responseRef, { mealOptOut: false, mealDecided: true, mealAccepted: true }, { merge: true });
        await logEvent("Emily decided to eat it anyway");
    });
}


const pickSomethingList = document.getElementById('pick-something-list');
const noneOfTheseBtn = document.getElementById('none-of-these-btn');

function renderPickSomething(options) {
    pickSomethingList.innerHTML = '';
    options.forEach(meal => {
        const item = document.createElement('button');
        item.className = 'option-card';
        item.textContent = meal;
        item.addEventListener('click', async () => {
            await setDoc(responseRef, {
                mealOptions: [meal],
                mealDecided: true,
                mealAccepted: true,
                sortedByCall: false,
                mealStuck: false
            }, { merge: true });
            await logEvent(`Emily picked ${meal}`);
            
        });
        pickSomethingList.appendChild(item);
    });
}

if (noneOfTheseBtn) {
    noneOfTheseBtn.addEventListener('click', async () => {
        await setDoc(responseRef, { mealStuck: true, mealDecided: false, mealAccepted: null }, { merge: true });
        await logEvent("Couldn't agree — waiting on a call");
    });
}


const callDoneBtn = document.getElementById('call-done-btn');
if (callDoneBtn) {
    callDoneBtn.addEventListener('click', async () => {
        await setDoc(responseRef, {
            mealStuck: false,
            mealOptions: [],
            mealDecided: true,
            sortedByCall: true
        }, { merge: true });
        await logEvent("Sorted out over a call");
        const role = getMyRole();
        if (role === 'mum') {
            showScreen('screen-home');
        }
    });
}


if (optionAsk) {
    optionAsk.addEventListener('click', async () => {
        await setDoc(responseRef, { askedPreference: true, mealDecided: false, mealAccepted: null }, { merge: true });
        await logEvent("Mum asked Emily what she wants");
        showScreen('screen-home');
    });
}


const preferenceList = document.getElementById('preference-list');
const noPreferenceBtn = document.getElementById('no-preference-btn');

function renderPreferenceList() {
    preferenceList.innerHTML = '';
    mealList.forEach(meal => {
        const item = document.createElement('button');
        item.className = 'option-card';
        item.textContent = meal;
        item.addEventListener('click', async () => {
            await setDoc(responseRef, { mealOptions: [meal], preferenceSubmitted: true }, { merge: true });
            await logEvent(`Emily suggested ${meal}`);
        });
        preferenceList.appendChild(item);
    });
}
renderPreferenceList();

if (noPreferenceBtn) {
    noPreferenceBtn.addEventListener('click', async () => {
        await setDoc(responseRef, { noPreference: true }, { merge: true });
        await logEvent("Emily said she had no preference");
    });
}


const preferenceResponseMeal = document.getElementById('preference-response-meal');
const acceptPreferenceBtn = document.getElementById('accept-preference-btn');
const denyPreferenceBtn = document.getElementById('deny-preference-btn');

if (acceptPreferenceBtn) {
    acceptPreferenceBtn.addEventListener('click', async () => {
        await setDoc(responseRef, { mealDecided: true, mealAccepted: true, preferenceSubmitted: false }, { merge: true });
        await logEvent("Meal confirmed for tonight");
    });
}

if (denyPreferenceBtn) {
    denyPreferenceBtn.addEventListener('click', async () => {
        await setDoc(responseRef, { preferenceSubmitted: false }, { merge: true });
        openMealList(3, "Pick up to 3 options");
    });
}


const editMealsList = document.getElementById('edit-meals-list');
const newMealInput = document.getElementById('new-meal-input');
const addMealBtn = document.getElementById('add-meal-btn');
const backFromMeals = document.getElementById('back-from-meals');


function renderEditMealsList() {
    editMealsList.innerHTML = '';
    mealList.forEach((meal, index) => {
        const row = document.createElement('div');
        row.className = 'info-row';
        row.innerHTML = `
            <div class="info-text"><p class="info-title">${meal}</p></div>
        `;
        const removeBtn = document.createElement('span');
        removeBtn.innerHTML = '<i class="ti ti-x"></i>';
        removeBtn.style.cursor = 'pointer';
        removeBtn.style.color = 'var(--text-secondary)';
        removeBtn.addEventListener('click', async () => {
            if (mealList.length <= 3) {
                alert("You need at least 3 meals in the list.");
                return;
            }
            mealList = mealList.filter((_, i) => i !== index);
            await setDoc(mealListRef, { meals: mealList });
        });
        row.appendChild(removeBtn);
        editMealsList.appendChild(row);
    });
}

if (addMealBtn) {
    addMealBtn.addEventListener('click', async () => {
        const newMeal = newMealInput.value.trim();
        if (!newMeal) return;
        mealList.push(newMeal);
        await setDoc(mealListRef, { meals: mealList });
        newMealInput.value = '';
    });
}

if (backFromMeals) {
     backFromMeals.addEventListener('click', () => goBack());
}



onSnapshot(mealListRef, (snapshot) => {
    if (snapshot.exists()) {
        mealList = snapshot.data().meals || [];
    } else {
        mealList = ["Spaghetti", "Roast chicken", "Fish and salad"];
        setDoc(mealListRef, { meals: mealList });
    }
    renderEditMealsList();
    renderPreferenceList();

});















const backToHome = document.getElementById('back-to-home');
if (backToHome) {
     backToHome.addEventListener('click', () => goBack());
}

async function respondToInvite(response) {
    const pickedTimeInput = document.getElementById('picked-time-input');
    const pickedTime = response ? (pickedTimeInput?.value || null) : null;

    await setDoc(responseRef, {
        attending: response,
        pickedTime: pickedTime,
        respondedAt: new Date().toISOString()
    }, { merge: true });

    const timeMsg = pickedTime ? ` at ${formatTime12Hour(pickedTime)}` : "";
    await logEvent(response ? `Emily confirmed she's coming${timeMsg}` : "Emily said she's sorting herself out");
}

async function sendInvite() {
    const windowStart = timeWindowStart.value || null;
    const windowEnd = timeWindowEnd.value || null;

    await setDoc(responseRef, {
        inviteSent: true,
        inviteSentAt: new Date().toISOString(),
        date: getTodayDateString(),
        timeWindowStart: windowStart,
        timeWindowEnd: windowEnd,
        time: null,
        pickedTime: null,
        nudgeSent: false,
        attending: null,
        respondedAt: null,
        mealOptions: [],
        mealDecided: false,
        mealAccepted: null,
        mealOptOut: false,
        mealReason: null,
        mealStuck: false,
        mealKept: false,
        sortedByCall: false,
        askedPreference: false,
        preferenceSubmitted: false,
        noPreference: false,
        events: []
    }, { merge: true });

    const windowMsg = (windowStart && windowEnd)
      ? ` — free between ${formatTime12Hour(windowStart)} and ${formatTime12Hour(windowEnd)}`
      : '';
    await logEvent("Invite sent to Emily" + windowMsg);

    showScreen('screen-home');
}

sendInviteBtn.addEventListener('click', sendInvite);
yesButton.addEventListener('click', () => respondToInvite(true));
noButton.addEventListener('click', () => respondToInvite(false));


const backToHome2 = document.getElementById('back-to-home-2');
if (backToHome2) {
     backToHome2.addEventListener('click', () => goBack());
}

async function setupNotifications() {
    console.log("setupNotifications is running");
    try {
        const registration = await navigator.serviceWorker.register('firebase-messaging-sw.js');
        console.log("service worker registered:", registration);
        await navigator.serviceWorker.ready;
        console.log("service worker is ready");
        const permission = await Notification.requestPermission();
        console.log("permission result:", permission);

        if (permission === 'granted') {
            const token = await window.getMessagingToken(window.messaging, {
                vapidKey: 'BObHCpx3oy2Vejith0xVJbHvao-3MbFF5Kx1Tuq9gB-u5Vf0O6IfTIdP9T9hZMb6GWCNB21CCCcITm5P1WXby-o',
                serviceWorkerRegistration: registration
            });
            console.log("token:", token);

            if (token) {
                const role = getMyRole();
                await setDoc(responseRef, {
                    [role === 'mum' ? 'mumToken' : 'emilyToken']: token
                }, { merge: true });
                console.log("token saved to firestore");
            }
        }
    } catch (error) {
        console.log('Notification setup failed:', error);
    }
}

onSnapshot(responseRef, (snapshot) => {
    const currentRole = getMyRole();

    if (snapshot.exists()) {
        const data = snapshot.data();
        updateCheckpoints(data);
        renderActivityList(data);


        if (currentRole === 'mum') {
            showScreen('screen-home', false);
        } else if (currentRole === 'emily') {
            routeEmily(data);
        }




        const nudgeBanner = document.getElementById('nudge-banner');
        if (nudgeBanner) {
            nudgeBanner.style.display = data.nudgeSent ? 'block' : 'none';
        }

        if (preferenceResponseMeal && data.mealOptions && data.mealOptions[0]) {
        preferenceResponseMeal.textContent = data.mealOptions[0];
        }


        const mealResponseReason = document.getElementById('meal-response-reason');
        if (mealResponseReason && data.mealReason) {
           const mealName = data.mealOptions && data.mealOptions[0] ? data.mealOptions[0] : "the meal";
           mealResponseReason.textContent = `${mealName}: "${data.mealReason}"`;
        }

        const timeText = document.getElementById('invite-time-text');
        const timePickerGroup = document.getElementById('time-picker-group');
        if (timeText) {
            if (data.timeWindowStart && data.timeWindowEnd) {
                timeText.textContent = `Mum's free between ${formatTime12Hour(data.timeWindowStart)} and ${formatTime12Hour(data.timeWindowEnd)}`;
                if (timePickerGroup) timePickerGroup.style.display = 'block';
            } else {
                timeText.textContent = "Mum's free for dinner tonight";
                if (timePickerGroup) timePickerGroup.style.display = 'block';
            }
        }

       


        if (mealCheckName && data.mealOptions && data.mealOptions.length > 0) {
        mealCheckName.textContent = data.mealOptions[0];
        }

        const optoutMealName = document.getElementById('optout-meal-name');
        if (optoutMealName && data.mealOptions && data.mealOptions[0]) {
            optoutMealName.textContent = data.mealOptions[0];
        }

        if (data.mealOptions && data.mealOptions.length > 1) {
        renderPickSomething(data.mealOptions);
        }

        statusLine.textContent = data.attending === true
            ? "Yes — confirmed for tonight"
            : data.attending === false
                ? "Sorting themselves out tonight"
                : "Waiting for a response...";
    } else {
        statusLine.textContent = "Waiting for a response...";
    
    
    }

});


function updateCheckpoints(data) {
    const checkpoint1 = document.getElementById('checkpoint-1');
    const checkpoint2 = document.getElementById('checkpoint-2');
    const checkpoint3 = document.getElementById('checkpoint-3');
    const bigTag = document.getElementById('big-status-tag');
    const actionBtn = document.getElementById('home-action-btn');

    if (!checkpoint1 || !checkpoint2 || !checkpoint3 || !bigTag) return;

    if (data.date && data.date !== getTodayDateString()) {
        data = {};
    }

    [checkpoint1, checkpoint2, checkpoint3].forEach(cp => {
        cp.classList.remove('done', 'active', 'upcoming');
    });

    let activeStage = 1;

    if (data.attending === true) {
        activeStage = 2;
    } else if (data.attending === false) {
        activeStage = 3;
    }

    if (activeStage === 2 && (data.mealDecided === true || data.mealStuck === true)) {
    activeStage = 3;
    }

    actionBtn.style.display = 'none';
    actionBtn.onclick = null;

    if (activeStage === 1) {
        checkpoint1.classList.add('active');
        checkpoint2.classList.add('upcoming');
        checkpoint3.classList.add('upcoming');

        if (!data.inviteSent) {
            bigTag.textContent = "Not started";
            actionBtn.textContent = "Send invite";
            actionBtn.style.display = 'block';
            actionBtn.onclick = () => showScreen('screen-attendance');
        } else {
            bigTag.textContent = "Waiting for a response";
        }
    }

    if (activeStage === 2) {
        checkpoint1.classList.add('done');
        checkpoint2.classList.add('active');
        checkpoint3.classList.add('upcoming');

        if (data.askedPreference && (!data.mealOptions || data.mealOptions.length === 0) && !data.noPreference) {
            bigTag.textContent = "Waiting for a preference";
        } else if (data.noPreference) {
            bigTag.textContent = "No preference — pick something";
            actionBtn.textContent = "Choose a meal";
            actionBtn.style.display = 'block';
            actionBtn.onclick = () => openMealList(3, "Pick up to 3 options");
        } else if (data.preferenceSubmitted && !data.mealDecided) {
            bigTag.textContent = `Emily wants ${data.mealOptions[0]}`;
            actionBtn.textContent = "Respond";
            actionBtn.style.display = 'block';
            actionBtn.onclick = () => showScreen('screen-preference-response');
        } else if (!data.mealOptions || data.mealOptions.length === 0) {
            const pickedTimeText = data.pickedTime ? ` — ${formatTime12Hour(data.pickedTime)}` : '';
            bigTag.textContent = `Deciding what's for dinner${pickedTimeText}`;
            actionBtn.textContent = "Choose a meal";
            actionBtn.style.display = 'block';
            actionBtn.onclick = () => showScreen('screen-meal-controls');

        } else if (data.mealKept === true && data.mealDecided === false) {
            bigTag.textContent = "Waiting on Emily's decision";
        } else if (data.mealAccepted === false) {

            bigTag.textContent = "Needs a new meal";
            actionBtn.textContent = "Respond to Emily";
            actionBtn.style.display = 'block';
            actionBtn.onclick = () => showScreen('screen-meal-response');
            
        } else if (data.mealOptions.length === 1) {
            bigTag.textContent = `Waiting on ${data.mealOptions[0]}`;
        } else {
            bigTag.textContent = "Waiting on a pick from 3 options";
        }
    }

        if (activeStage === 3) {
        checkpoint1.classList.add('done');
        checkpoint2.classList.add('done');
        checkpoint3.classList.add('active');

        if (data.attending === false) {
            bigTag.textContent = "Sorting themselves out tonight";
        } else if (data.mealOptOut === true) {
            bigTag.textContent = "Emily opted out for dinner tonight";
        } else if (data.mealStuck === true) {
            bigTag.textContent = "Couldn't agree — give each other a call";
            actionBtn.textContent = "Sorted it out";
            actionBtn.style.display = 'block';
            actionBtn.onclick = async () => {
                await setDoc(responseRef, {
                    mealStuck: false,
                    mealOptions: [],
                    mealDecided: true,
                    sortedByCall: true
                }, { merge: true });
                await logEvent("Sorted out over a call");
            };
        } else if (data.sortedByCall === true) {
            bigTag.textContent = "Sorted out on a call";
        } else if (data.mealDecided === true) {
            const meal = data.mealOptions && data.mealOptions[0] ? data.mealOptions[0] : "Dinner";
            const time = data.pickedTime ? formatTime12Hour(data.pickedTime) : null;
            bigTag.innerHTML = `
                <div class="tag-meal-name">${meal}</div>
                <div class="tag-meal-details">${time ? `${time} · ` : ''}Emily's in</div>
            `;
        } else {
            bigTag.textContent = "Not there yet";
        }
    }
}




function routeEmily(data) {
    console.log("data.date:", data.date, "| today:", getTodayDateString(), "| stale?", data.date && data.date !== getTodayDateString())

    const isStale = data.date && data.date !== getTodayDateString();
    const d = isStale ? {} : data;
    if (!d.inviteSent) {
        document.getElementById('emily-waiting-eyebrow').textContent = "Nothing from Mum yet";
        document.getElementById('emily-waiting-heading').textContent = "You'll see it here once she starts tonight's dinner check";
        document.getElementById('nudge-section').style.display = 'block';
        showScreen('screen-emily-waiting');
    } else if (d.attending === null || d.attending === undefined) {
        showScreen('screen-invite');
    } else if (d.attending === true) {
        if (d.mealOptOut === true || d.mealDecided === true) {
            showEmilyResolved(d);
        } else if (d.mealStuck === true) {
            showScreen('screen-call-each-other');
        } else if (d.mealKept === true) {
            showScreen('screen-optout');
        } else if (d.askedPreference && !d.mealOptions?.length && !d.noPreference && !d.preferenceSubmitted) {
            showScreen('screen-preference');
        } else if (d.preferenceSubmitted && d.mealAccepted === null) {
            document.getElementById('emily-waiting-eyebrow').textContent = "You're in for tonight";
            document.getElementById('emily-waiting-heading').textContent = `Mum's deciding on ${d.mealOptions[0]}`;
            document.getElementById('nudge-section').style.display = 'none';
            showScreen('screen-emily-waiting');
        } else if (d.mealOptions && d.mealOptions.length === 1 && d.mealAccepted === null) {
            showScreen('screen-meal-check');
        } else if (d.mealOptions && d.mealOptions.length > 1) {
            showScreen('screen-pick-something');
        } else {
            document.getElementById('emily-waiting-eyebrow').textContent = "You're in for tonight";
            document.getElementById('emily-waiting-heading').textContent = "Mum's still deciding what to cook";
             document.getElementById('nudge-section').style.display = 'none';
            showScreen('screen-emily-waiting');
        }
    } else {
        document.getElementById('emily-waiting-eyebrow').textContent = "All good";
        document.getElementById('emily-waiting-heading').textContent = "You're sorting yourself out tonight ";
         document.getElementById('nudge-section').style.display = 'none';
        showScreen('screen-emily-waiting');
    }
}

function renderActivityList(data) {
    const list = document.getElementById('activity-list');
    if (!list) return;
    list.innerHTML = '';

    const isStale = data.date && data.date !== getTodayDateString();
    const events = isStale ? [] : (data.events || []);

    const teaserSubtitle = document.getElementById('activity-teaser-subtitle');
    if (teaserSubtitle) {
        teaserSubtitle.textContent = events.length === 0
            ? "Nothing yet"
            : `${events.length} update${events.length > 1 ? 's' : ''}`;
    }

    if (events.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 13px;">Nothing yet tonight.</p>';
        return;
    }

    events.forEach(event => {
        const row = document.createElement('div');
        row.className = 'info-row';
        const timeStr = new Date(event.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
        row.innerHTML = `<div class="info-text"><p class="info-title">${event.text}</p><p class="info-subtitle">${timeStr}</p></div>`;
        list.appendChild(row);
    });
}

function showEmilyResolved(data) {
    const heading = document.getElementById('emily-resolved-heading');
    const detail = document.getElementById('emily-resolved-detail');

    if (data.sortedByCall === true) {
        heading.textContent = "Sorted out on a call";
        detail.textContent = "You and mum figured it out together.";
    } else if (data.mealOptOut === true) {
        heading.textContent = "Sorting yourself out";
        detail.textContent = "You're doing your own thing tonight.";
    } else if (data.mealStuck === true) {
        heading.textContent = "Give mum a call";
        detail.textContent = "You two couldn't agree — a quick call should sort it out.";
    } else if (data.mealDecided === true) {
        const meal = data.mealOptions && data.mealOptions[0] ? data.mealOptions[0] : "dinner";
        const time = data.pickedTime ? ` at ${formatTime12Hour(data.pickedTime)}` : "";
        heading.textContent = meal;
        detail.textContent = `You're all set${time}.`;
    } else {
        heading.textContent = "All set";
        detail.textContent = "";
    }

    showScreen('screen-emily-resolved');
}




const navActivity = document.getElementById('nav-activity');
const backFromActivity = document.getElementById('back-from-activity');

if (navActivity) {
    navActivity.addEventListener('click', () => showScreen('screen-activity'));
}

if (backFromActivity) {
    backFromActivity.addEventListener('click', async () => {
        const role = getMyRole();
        if (role === 'mum') {
            showScreen('screen-home');
        } else {
            const snapshot = await getDoc(responseRef);
            if (snapshot.exists()) {
                routeEmily(snapshot.data());
            } else {
                showScreen('screen-emily-waiting');
            }
        }
    });
}


const navSettings = document.getElementById('nav-settings');
const backFromSettings = document.getElementById('back-from-settings');
const switchRoleBtn = document.getElementById('switch-role-btn');
const currentRoleLabel = document.getElementById('current-role-label');

if (navSettings) {
    navSettings.addEventListener('click', () => {
        currentRoleLabel.textContent = getMyRole() === 'mum' ? 'Mum' : 'Emily';
        showScreen('screen-settings');
    });
}

if (backFromSettings) {
    backFromSettings.addEventListener('click', async () => {
        const role = getMyRole();
        if (role === 'mum') {
            showScreen('screen-home');
        } else {
            const snapshot = await getDoc(responseRef);
            if (snapshot.exists()) {
                routeEmily(snapshot.data());
            } else {
                showScreen('screen-emily-waiting');
            }
        }
    });
}

if (switchRoleBtn) {
    switchRoleBtn.addEventListener('click', () => {
        localStorage.removeItem('dingRole');
        showScreen('screen-role-select');
    });
}


function attachDataActionListeners(container) {
    container.querySelectorAll('[data-action]').forEach(el => {
        el.addEventListener('click', () => {
            const action = el.getAttribute('data-action');
            if (action === 'home') showScreen('screen-home');
            if (action === 'attendance') showScreen('screen-attendance');
            if (action === 'activity') {
                showScreen('screen-activity');
                applyRoleNavBar('activity-navbar');
            }
            if (action === 'edit-meals') showScreen('screen-edit-meals');
            if (action === 'settings') {
                currentRoleLabel.textContent = getMyRole() === 'mum' ? 'Mum' : 'Emily';
                showScreen('screen-settings');
                applyRoleNavBar('settings-navbar');
            }
        });
    });
}

attachDataActionListeners(document);


function applyRoleNavBar(navbarId) {
    const navbar = document.getElementById(navbarId);
    if (!navbar) return;

    if (getMyRole() === 'emily') {
        navbar.innerHTML = `
            <i class="nav-icon ti ti-history" data-action="activity"></i>
            <i class="nav-icon ti ti-settings" data-action="settings"></i>
        `;
        navbar.style.justifyContent = 'center';
        navbar.style.gap = '40px';
    } else {
        navbar.innerHTML = `
            <i class="nav-icon ti ti-home" data-action="home"></i>
            <i class="nav-icon ti ti-clipboard-list" data-action="edit-meals"></i>
            <div class="nav-spacer"></div>
            <i class="nav-icon ti ti-history" data-action="activity"></i>
            <i class="nav-icon ti ti-settings" data-action="settings"></i>
            <div class="nav-button" data-action="attendance">
                <i class="ti ti-bell"></i>
            </div>
        `;
        navbar.style.justifyContent = 'space-around';
        navbar.style.gap = '20px';
    }
    attachDataActionListeners(navbar);
}