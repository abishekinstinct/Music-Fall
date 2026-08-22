/* =========================================================
   VIBEMUSIC PLAYER
========================================================= */

const audio = document.getElementById("audioPlayer");

const content = document.getElementById("content");

const playButton = document.getElementById("playButton");
const previousButton = document.getElementById("previousButton");
const nextButton = document.getElementById("nextButton");

const shuffleButton = document.getElementById("shuffleButton");
const repeatButton = document.getElementById("repeatButton");

const progressBar = document.getElementById("progressBar");

const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");

const playerTitle = document.getElementById("playerTitle");
const playerArtist = document.getElementById("playerArtist");

const playerCover = document.getElementById("playerCover");

const likeButton = document.getElementById("likeButton");

const volumeSlider = document.getElementById("volumeSlider");
const muteButton = document.getElementById("muteButton");

const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");

const addSongButton = document.getElementById("addSongButton");
const addSongDialog = document.getElementById("addSongDialog");

const songFiles = document.getElementById("songFiles");
const selectedFiles = document.getElementById("selectedFiles");
const saveSongs = document.getElementById("saveSongs");

const playlistDialog = document.getElementById("playlistDialog");
const playlistForm = document.getElementById("playlistForm");
const playlistName = document.getElementById("playlistName");

const playlistList = document.getElementById("playlistList");

const createPlaylist = document.getElementById("createPlaylist");

const toast = document.getElementById("toast");


/* =========================================================
   DATA
========================================================= */

let songs = [];

let currentIndex = -1;

let shuffle = false;

let repeat = false;

let likedSongs =
    JSON.parse(
        localStorage.getItem("vibemusic-liked") || "[]"
    );

let recentlyPlayed =
    JSON.parse(
        localStorage.getItem("vibemusic-recent") || "[]"
    );

let playlists =
    JSON.parse(
        localStorage.getItem("vibemusic-playlists") || "{}"
    );

let localSongs = [];

let deferredInstallPrompt = null;


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    audio.volume = 0.8;

    await loadSongs();

    renderHome();

    renderPlaylists();

});


/* =========================================================
   LOAD SONG DATABASE
========================================================= */

async function loadSongs() {

    try {

        const response = await fetch("songs.json", {
            cache: "no-cache"
        });

        if (!response.ok) {
            throw new Error("songs.json could not be loaded");
        }

        const databaseSongs = await response.json();

        if (Array.isArray(databaseSongs)) {

            songs = databaseSongs.map((song, index) => ({

                ...song,

                id:
                    song.id ??
                    `song-${index + 1}`

            }));

        }

    } catch (error) {

        console.error(error);

        songs = [];

        showToast(
            "Could not load songs.json"
        );

    }

}


/* =========================================================
   SONG HELPERS
========================================================= */

function getSongId(song) {

    return String(song.id);

}


function getSongCover(song) {

    return song.cover || "";

}


function isLiked(song) {

    return likedSongs.includes(
        getSongId(song)
    );

}


/* =========================================================
   PLAY SONG
========================================================= */

function playSong(index, autoPlay = true) {

    if (!songs.length) {
        showToast("No songs available");
        return;
    }

    if (index < 0) {
        index = songs.length - 1;
    }

    if (index >= songs.length) {
        index = 0;
    }

    currentIndex = index;

    const song = songs[currentIndex];

    if (!song.audio) {

        showToast(
            "This song has no audio file"
        );

        return;

    }


    /* AUDIO SOURCE */

    audio.src = song.audio;

    audio.load();


    /* PLAYER INFO */

    playerTitle.textContent =
        song.title || "Unknown Song";

    playerArtist.textContent =
        song.artist || "Unknown Artist";


    /* COVER */

    updatePlayerCover(song);


    /* LIKE */

    updateLikeButton();


    /* RECENTLY PLAYED */

    addRecentlyPlayed(song);


    /* UPDATE SONG LIST */

    updatePlayingRows();


    /* PLAY */

    if (autoPlay) {

        audio.play()
            .then(() => {

                updatePlayButton();

            })
            .catch(error => {

                console.log(
                    "Playback waiting for user interaction:",
                    error
                );

            });

    }


    renderCurrentPage();
}


/* =========================================================
   COVER
========================================================= */

function updatePlayerCover(song) {

    const cover = getSongCover(song);

    if (cover) {

        playerCover.innerHTML =
            `<img src="${escapeHtml(cover)}" alt="">`;

    } else {

        playerCover.innerHTML =
            `<span>♫</span>`;

    }

}


/* =========================================================
   PLAY / PAUSE
========================================================= */

function togglePlay() {

    if (currentIndex === -1) {

        if (songs.length) {

            playSong(0, true);

        } else {

            showToast("No songs available");

        }

        return;

    }


    if (audio.paused) {

        audio.play()
            .catch(() => {});

    } else {

        audio.pause();

    }

}


playButton.addEventListener(
    "click",
    togglePlay
);


audio.addEventListener(
    "play",
    updatePlayButton
);

audio.addEventListener(
    "pause",
    updatePlayButton
);


function updatePlayButton() {

    playButton.textContent =
        audio.paused ? "▶" : "Ⅱ";

    playButton.title =
        audio.paused ? "Play" : "Pause";

}


/* =========================================================
   PREVIOUS
========================================================= */

previousButton.addEventListener(
    "click",
    () => {

        if (!songs.length) return;

        let index;

        if (shuffle) {

            index =
                Math.floor(
                    Math.random() * songs.length
                );

        } else {

            index = currentIndex - 1;

        }

        playSong(index);

    }
);


/* =========================================================
   NEXT
========================================================= */

nextButton.addEventListener(
    "click",
    playNext
);


function playNext() {

    if (!songs.length) return;

    let nextIndex;

    if (shuffle) {

        if (songs.length === 1) {

            nextIndex = 0;

        } else {

            do {

                nextIndex =
                    Math.floor(
                        Math.random() *
                        songs.length
                    );

            } while (
                nextIndex === currentIndex
            );

        }

    } else {

        nextIndex =
            currentIndex + 1;

        if (nextIndex >= songs.length) {
            nextIndex = 0;
        }

    }

    playSong(nextIndex);

}


/* =========================================================
   WHEN SONG ENDS
========================================================= */

audio.addEventListener(
    "ended",
    () => {

        if (repeat === "one") {

            audio.currentTime = 0;

            audio.play();

            return;

        }

        playNext();

    }
);


/* =========================================================
   SHUFFLE
========================================================= */

shuffleButton.addEventListener(
    "click",
    () => {

        shuffle = !shuffle;

        shuffleButton.classList.toggle(
            "active",
            shuffle
        );

        showToast(
            shuffle
                ? "Shuffle enabled"
                : "Shuffle disabled"
        );

    }
);


/* =========================================================
   REPEAT
========================================================= */

repeatButton.addEventListener(
    "click",
    () => {

        if (repeat === false) {

            repeat = true;

            repeatButton.classList.add(
                "active"
            );

            repeatButton.textContent = "🔁";

            showToast("Repeat all enabled");

        } else if (repeat === true) {

            repeat = "one";

            repeatButton.classList.add(
                "active"
            );

            repeatButton.textContent = "🔂";

            showToast("Repeat song enabled");

        } else {

            repeat = false;

            repeatButton.classList.remove(
                "active"
            );

            repeatButton.textContent = "🔁";

            showToast("Repeat disabled");

        }

    }
);


/* =========================================================
   PROGRESS BAR
========================================================= */

audio.addEventListener(
    "loadedmetadata",
    () => {

        durationEl.textContent =
            formatTime(audio.duration);

        progressBar.max =
            audio.duration || 100;

    }
);


audio.addEventListener(
    "timeupdate",
    () => {

        if (!audio.duration) return;

        progressBar.value =
            audio.currentTime;

        currentTimeEl.textContent =
            formatTime(audio.currentTime);

    }
);


progressBar.addEventListener(
    "input",
    () => {

        audio.currentTime =
            Number(progressBar.value);

    }
);


/* =========================================================
   TIME FORMAT
========================================================= */

function formatTime(seconds) {

    if (!Number.isFinite(seconds)) {
        return "0:00";
    }

    const minutes =
        Math.floor(seconds / 60);

    const secs =
        Math.floor(seconds % 60);

    return `${minutes}:${secs
        .toString()
        .padStart(2, "0")}`;

}


/* =========================================================
   VOLUME
========================================================= */

volumeSlider.addEventListener(
    "input",
    () => {

        audio.volume =
            Number(volumeSlider.value);

        updateVolumeIcon();

    }
);


muteButton.addEventListener(
    "click",
    () => {

        audio.muted =
            !audio.muted;

        updateVolumeIcon();

    }
);


function updateVolumeIcon() {

    if (
        audio.muted ||
        audio.volume === 0
    ) {

        muteButton.textContent = "🔇";

    } else if (audio.volume < 0.5) {

        muteButton.textContent = "🔉";

    } else {

        muteButton.textContent = "🔊";

    }

}


/* =========================================================
   LIKE / FAVORITES
========================================================= */

likeButton.addEventListener(
    "click",
    () => {

        if (currentIndex === -1) return;

        const song =
            songs[currentIndex];

        toggleLike(song);

    }
);


function toggleLike(song) {

    const id =
        getSongId(song);

    if (likedSongs.includes(id)) {

        likedSongs =
            likedSongs.filter(
                x => x !== id
            );

        showToast(
            "Removed from favorites"
        );

    } else {

        likedSongs.push(id);

        showToast(
            "Added to favorites ❤️"
        );

    }

    localStorage.setItem(
        "vibemusic-liked",
        JSON.stringify(likedSongs)
    );

    updateLikeButton();

    renderCurrentPage();

}


function updateLikeButton() {

    if (currentIndex === -1) {

        likeButton.textContent = "♡";

        likeButton.classList.remove(
            "liked"
        );

        return;

    }

    const song =
        songs[currentIndex];

    const liked =
        isLiked(song);

    likeButton.textContent =
        liked ? "♥" : "♡";

    likeButton.classList.toggle(
        "liked",
        liked
    );

}


/* =========================================================
   RECENTLY PLAYED
========================================================= */

function addRecentlyPlayed(song) {

    const id =
        getSongId(song);

    recentlyPlayed =
        recentlyPlayed.filter(
            item => item !== id
        );

    recentlyPlayed.unshift(id);

    recentlyPlayed =
        recentlyPlayed.slice(0, 30);

    localStorage.setItem(
        "vibemusic-recent",
        JSON.stringify(
            recentlyPlayed
        )
    );

}


/* =========================================================
   RENDER HOME
========================================================= */

function renderHome() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();

    let filtered =
        songs.filter(song => {

            const title =
                String(song.title || "")
                    .toLowerCase();

            const artist =
                String(song.artist || "")
                    .toLowerCase();

            return (
                title.includes(search) ||
                artist.includes(search)
            );

        });


    content.innerHTML = `

        <div class="page-header">

            <h1>
                ${search
                    ? "Search Results"
                    : "Your Music"}
            </h1>

            <p>
                ${search
                    ? `${filtered.length} songs found`
                    : "Tap any song to start listening"}
            </p>

        </div>

        <div class="song-list">

            ${
                filtered.length
                ? filtered
                    .map(song =>
                        songRow(song)
                    )
                    .join("")
                : emptyState(
                    search
                        ? "No songs found"
                        : "No music yet"
                )
            }

        </div>
    `;

    attachSongEvents();

}


/* =========================================================
   SONG ROW
========================================================= */

function songRow(song) {

    const originalIndex =
        songs.findIndex(
            s =>
                getSongId(s) ===
                getSongId(song)
        );

    const liked =
        isLiked(song);

    const cover =
        getSongCover(song);

    const isPlaying =
        originalIndex === currentIndex;


    return `

        <div
            class="song-row ${isPlaying ? "playing" : ""}"
            data-index="${originalIndex}">

            <div class="song-cover">

                ${
                    cover
                    ? `<img
                        src="${escapeHtml(cover)}"
                        alt=""
                        class="song-cover">`
                    : "♫"
                }

            </div>


            <div class="song-info">

                <div class="song-title">
                    ${
                        escapeHtml(
                            song.title ||
                            "Unknown Song"
                        )
                    }
                </div>

                <div class="song-artist">
                    ${
                        escapeHtml(
                            song.artist ||
                            "Unknown Artist"
                        )
                    }
                </div>

            </div>


            <span class="song-duration">
                ${song.duration || ""}
            </span>


            <button
                class="song-like ${liked ? "liked" : ""}"
                data-like="${escapeHtml(getSongId(song))}"
                title="Favorite">

                ${liked ? "♥" : "♡"}

            </button>

        </div>
    `;

}


/* =========================================================
   ATTACH SONG EVENTS
========================================================= */

function attachSongEvents() {

    document
        .querySelectorAll(".song-row")
        .forEach(row => {

            row.addEventListener(
                "click",
                event => {

                    if (
                        event.target.closest(
                            ".song-like"
                        )
                    ) {
                        return;
                    }

                    const index =
                        Number(
                            row.dataset.index
                        );

                    /*
                       IMPORTANT:
                       Clicking/touching the
                       song itself immediately
                       starts playback.
                    */

                    playSong(index, true);

                }
            );

        });


    document
        .querySelectorAll(".song-like")
        .forEach(button => {

            button.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    const id =
                        button.dataset.like;

                    const song =
                        songs.find(
                            s =>
                                getSongId(s) === id
                        );

                    if (song) {
                        toggleLike(song);
                    }

                }
            );

        });

}


/* =========================================================
   RECENTLY PLAYED PAGE
========================================================= */

function renderRecentlyPlayed() {

    const recentSongs =
        recentlyPlayed
            .map(id =>
                songs.find(
                    song =>
                        getSongId(song) ===
                        String(id)
                )
            )
            .filter(Boolean);


    content.innerHTML = `

        <div class="page-header">

            <h1>
                Recently Played
            </h1>

            <p>
                Your listening history
            </p>

        </div>

        <div class="song-list">

            ${
                recentSongs.length
                ? recentSongs
                    .map(song =>
                        songRow(song)
                    )
                    .join("")
                : emptyState(
                    "Nothing played recently"
                )
            }

        </div>
    `;

    attachSongEvents();

}


/* =========================================================
   FAVORITES PAGE
========================================================= */

function renderLiked() {

    const favoriteSongs =
        songs.filter(
            song =>
                isLiked(song)
        );


    content.innerHTML = `

        <div class="page-header">

            <h1>
                Favorites ❤️
            </h1>

            <p>
                Songs you've saved
            </p>

        </div>

        <div class="song-list">

            ${
                favoriteSongs.length
                ? favoriteSongs
                    .map(song =>
                        songRow(song)
                    )
                    .join("")
                : emptyState(
                    "No favorite songs yet"
                )
            }

        </div>
    `;

    attachSongEvents();

}


/* =========================================================
   LIBRARY
========================================================= */

function renderLibrary() {

    content.innerHTML = `

        <div class="page-header">

            <h1>
                Your Library
            </h1>

            <p>
                All your music
            </p>

        </div>

        <div class="song-list">

            ${
                songs.length
                ? songs
                    .map(song =>
                        songRow(song)
                    )
                    .join("")
                : emptyState(
                    "Your library is empty"
                )
            }

        </div>
    `;

    attachSongEvents();

}


/* =========================================================
   CURRENT PAGE
========================================================= */

let currentPage = "home";


function renderCurrentPage() {

    if (currentPage === "home") {
        renderHome();

    } else if (currentPage === "library") {
        renderLibrary();

    } else if (currentPage === "liked") {
        renderLiked();

    } else if (currentPage === "recent") {
        renderRecentlyPlayed();
    }

}


/* =========================================================
   NAVIGATION
========================================================= */

document
    .querySelectorAll(".nav-btn")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                currentPage =
                    button.dataset.page;

                document
                    .querySelectorAll(
                        ".nav-btn"
                    )
                    .forEach(btn =>
                        btn.classList.remove(
                            "active"
                        )
                    );

                button.classList.add(
                    "active"
                );

                renderCurrentPage();

            }
        );

    });


/* =========================================================
   SEARCH
========================================================= */

searchInput.addEventListener(
    "input",
    renderHome
);


clearSearch.addEventListener(
    "click",
    () => {

        searchInput.value = "";

        renderHome();

        searchInput.focus();

    }
);


/* =========================================================
   LOCAL ADD SONGS
========================================================= */

addSongButton.addEventListener(
    "click",
    () => {

        addSongDialog.showModal();

    }
);


songFiles.addEventListener(
    "change",
    () => {

        const files =
            Array.from(
                songFiles.files
            );

        selectedFiles.innerHTML =
            files
                .map(
                    file =>
                        `<div>
                            🎵 ${escapeHtml(file.name)}
                        </div>`
                )
                .join("");

        saveSongs.disabled =
            files.length === 0;

    }
);


saveSongs.addEventListener(
    "click",
    event => {

        event.preventDefault();

        const files =
            Array.from(
                songFiles.files
            );

        files.forEach(file => {

            const localSong = {

                id:
                    `local-${Date.now()}-${Math.random()}`,

                title:
                    file.name
                        .replace(
                            /\.[^/.]+$/,
                            ""
                        ),

                artist:
                    "Local Song",

                audio:
                    URL.createObjectURL(
                        file
                    ),

                local: true

            };

            songs.push(localSong);

        });


        songFiles.value = "";

        selectedFiles.innerHTML = "";

        saveSongs.disabled = true;

        addSongDialog.close();

        renderCurrentPage();

        showToast(
            `${files.length} song(s) added`
        );

    }
);


/* =========================================================
   PLAYLISTS
========================================================= */

createPlaylist.addEventListener(
    "click",
    () => {

        playlistName.value = "";

        playlistDialog.showModal();

    }
);


playlistForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();

        const name =
            playlistName.value.trim();

        if (!name) return;

        playlists[name] =
            playlists[name] || [];

        localStorage.setItem(
            "vibemusic-playlists",
            JSON.stringify(
                playlists
            )
        );

        playlistDialog.close();

        renderPlaylists();

        showToast(
            `Playlist "${name}" created`
        );

    }
);


function renderPlaylists() {

    playlistList.innerHTML =
        Object.keys(playlists)
            .map(
                name =>
                    `<button
                        class="playlist-item"
                        data-playlist="${escapeHtml(name)}">
                        ♫ ${escapeHtml(name)}
                    </button>`
            )
            .join("");

}


/* =========================================================
   PLAYING ROWS
========================================================= */

function updatePlayingRows() {

    document
        .querySelectorAll(".song-row")
        .forEach(row => {

            const index =
                Number(
                    row.dataset.index
                );

            row.classList.toggle(
                "playing",
                index === currentIndex
            );

        });

}


/* =========================================================
   EMPTY STATE
========================================================= */

function emptyState(message) {

    return `

        <div style="
            text-align:center;
            padding:70px 20px;
            color:#77727e;
        ">

            <div style="
                font-size:45px;
                margin-bottom:15px;
            ">
                ♫
            </div>

            <h3 style="
                color:white;
                margin-bottom:8px;
            ">
                ${escapeHtml(message)}
            </h3>

            <p>
                Select a song to start listening.
            </p>

        </div>

    `;

}


/* =========================================================
   TOAST
========================================================= */

let toastTimer;

function showToast(message) {

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer =
        setTimeout(
            () => {
                toast.classList.remove(
                    "show"
                );
            },
            2200
        );

}


/* =========================================================
   SECURITY HELPER
========================================================= */

function escapeHtml(value) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   PWA INSTALL
========================================================= */

window.addEventListener(
    "beforeinstallprompt",
    event => {

        event.preventDefault();

        deferredInstallPrompt =
            event;

        const installButton =
            document.getElementById(
                "installButton"
            );

        installButton.classList.remove(
            "hidden"
        );

    }
);


document
    .getElementById("installButton")
    ?.addEventListener(
        "click",
        async () => {

            if (!deferredInstallPrompt) {
                return;
            }

            deferredInstallPrompt.prompt();

            await deferredInstallPrompt.userChoice;

            deferredInstallPrompt = null;

        }
    );
    /* =========================================================
   ADVANCED PLAYLIST SYSTEM
========================================================= */

let selectedPlaylistSongs = [];


/* ---------------------------------------------------------
   OPEN PLAYLIST CREATOR
--------------------------------------------------------- */

createPlaylist.addEventListener(
    "click",
    () => {

        playlistName.value = "";

        selectedPlaylistSongs = [];

        renderPlaylistSongSelector();

        playlistDialog.showModal();

    }
);


/* ---------------------------------------------------------
   CLOSE BUTTONS
--------------------------------------------------------- */

document
    .getElementById("closePlaylistDialog")
    .addEventListener(
        "click",
        () => {

            playlistDialog.close();

        }
    );


document
    .getElementById("cancelPlaylist")
    .addEventListener(
        "click",
        () => {

            playlistDialog.close();

        }
    );


/* ---------------------------------------------------------
   SONG SELECTOR
--------------------------------------------------------- */

function renderPlaylistSongSelector() {

    const selector =
        document.getElementById(
            "playlistSongSelector"
        );

    const count =
        document.getElementById(
            "selectedSongCount"
        );


    count.textContent =
        `${selectedPlaylistSongs.length} selected`;


    if (!songs.length) {

        selector.innerHTML = `

            <div style="
                padding:30px;
                text-align:center;
                color:#77727e;
            ">

                No songs available.

            </div>

        `;

        return;

    }


    selector.innerHTML =
        songs
            .map(song => {

                const id =
                    getSongId(song);

                const selected =
                    selectedPlaylistSongs
                        .includes(id);

                const cover =
                    getSongCover(song);


                return `

                    <label
                        class="
                            playlist-select-song
                            ${selected ? "selected" : ""}
                        "
                        data-id="${escapeHtml(id)}">

                        <input
                            type="checkbox"
                            class="playlist-check"
                            value="${escapeHtml(id)}"
                            ${selected ? "checked" : ""}>

                        <div class="playlist-mini-cover">

                            ${
                                cover
                                ? `
                                    <img
                                        src="${escapeHtml(cover)}"
                                        alt="">
                                `
                                : "♫"
                            }

                        </div>


                        <div class="playlist-select-info">

                            <strong>
                                ${escapeHtml(
                                    song.title ||
                                    "Unknown Song"
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    song.artist ||
                                    "Unknown Artist"
                                )}
                            </span>

                        </div>

                    </label>

                `;

            })
            .join("");


    selector
        .querySelectorAll(
            ".playlist-check"
        )
        .forEach(checkbox => {

            checkbox.addEventListener(
                "change",
                () => {

                    const id =
                        checkbox.value;


                    if (checkbox.checked) {

                        if (
                            !selectedPlaylistSongs
                                .includes(id)
                        ) {

                            selectedPlaylistSongs
                                .push(id);

                        }

                    } else {

                        selectedPlaylistSongs =
                            selectedPlaylistSongs
                                .filter(
                                    item =>
                                        item !== id
                                );

                    }


                    checkbox
                        .closest(
                            ".playlist-select-song"
                        )
                        .classList.toggle(
                            "selected",
                            checkbox.checked
                        );


                    document
                        .getElementById(
                            "selectedSongCount"
                        )
                        .textContent =
                        `${selectedPlaylistSongs.length} selected`;

                }
            );

        });

}


/* ---------------------------------------------------------
   CREATE PLAYLIST
--------------------------------------------------------- */

playlistForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();


        const name =
            playlistName.value.trim();


        if (!name) {

            showToast(
                "Enter a playlist name"
            );

            return;

        }


        if (
            selectedPlaylistSongs.length === 0
        ) {

            showToast(
                "Select at least one song"
            );

            return;

        }


        /* SAVE PLAYLIST */

        playlists[name] = {

            songs:
                [...selectedPlaylistSongs],

            created:
                Date.now()

        };


        localStorage.setItem(
            "vibemusic-playlists",
            JSON.stringify(
                playlists
            )
        );


        playlistDialog.close();


        renderPlaylists();


        showToast(
            `"${name}" playlist created 🎵`
        );

    }
);


/* =========================================================
   RENDER PLAYLISTS
========================================================= */

function renderPlaylists() {

    playlistList.innerHTML = "";


    const names =
        Object.keys(playlists);


    names.forEach(name => {

        const button =
            document.createElement(
                "button"
            );


        button.className =
            "playlist-item";


        button.innerHTML = `
            <span>♫</span>
            <span>${escapeHtml(name)}</span>
        `;


        button.addEventListener(
            "click",
            () => {

                renderPlaylistPage(name);

            }
        );


        playlistList.appendChild(
            button
        );

    });

}


/* =========================================================
   PLAYLIST PAGE
========================================================= */

function renderPlaylistPage(name) {

    currentPage =
        "playlist";


    const playlist =
        playlists[name];


    if (!playlist) {

        showToast(
            "Playlist not found"
        );

        return;

    }


    /*
       Old playlists may have been stored
       as simple arrays.
    */

    const playlistSongIds =
        Array.isArray(playlist)
        ? playlist
        : playlist.songs || [];


    const playlistSongs =
        playlistSongIds
            .map(id =>
                songs.find(
                    song =>
                        getSongId(song) ===
                        String(id)
                )
            )
            .filter(Boolean);


    content.innerHTML = `

        <div class="playlist-page-header">

            <div class="playlist-page-icon">
                ♫
            </div>

            <div>

                <h1>
                    ${escapeHtml(name)}
                </h1>

                <p>
                    ${playlistSongs.length}
                    ${
                        playlistSongs.length === 1
                        ? "song"
                        : "songs"
                    }
                </p>

            </div>

        </div>


        <div class="song-list">

            ${
                playlistSongs.length
                ? playlistSongs
                    .map(
                        song =>
                            songRow(song)
                    )
                    .join("")
                : emptyState(
                    "This playlist is empty"
                )
            }

        </div>

    `;


    attachSongEvents();

}


/* =========================================================
   UPDATE CURRENT PAGE
========================================================= */

const oldRenderCurrentPage =
    renderCurrentPage;


/*
   We need playlist pages to survive
   normal player updates.
*/

renderCurrentPage = function () {

    if (
        currentPage === "playlist"
    ) {

        /*
           Don't recreate playlist
           unnecessarily.
        */

        return;

    }


    oldRenderCurrentPage();

};
