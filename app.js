/* =========================================================
   VIBEMUSIC - COMPLETE MUSIC ENGINE
   Auto-loads ALL MP3 files from /music/
   ========================================================= */

const audio = document.getElementById("audioPlayer");

const content = document.getElementById("content");
const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");

const playButton = document.getElementById("playButton");
const previousButton = document.getElementById("previousButton");
const nextButton = document.getElementById("nextButton");
const shuffleButton = document.getElementById("shuffleButton");
const repeatButton = document.getElementById("repeatButton");

const progressBar = document.getElementById("progressBar");
const currentTime = document.getElementById("currentTime");
const duration = document.getElementById("duration");

const volumeSlider = document.getElementById("volumeSlider");
const muteButton = document.getElementById("muteButton");

const playerTitle = document.getElementById("playerTitle");
const playerArtist = document.getElementById("playerArtist");
const playerCover = document.getElementById("playerCover");
const likeButton = document.getElementById("likeButton");

const toast = document.getElementById("toast");

const addSongButton = document.getElementById("addSongButton");
const addSongDialog = document.getElementById("addSongDialog");
const songFiles = document.getElementById("songFiles");
const selectedFiles = document.getElementById("selectedFiles");
const saveSongs = document.getElementById("saveSongs");

const createPlaylist = document.getElementById("createPlaylist");
const playlistDialog = document.getElementById("playlistDialog");
const playlistForm = document.getElementById("playlistForm");
const playlistName = document.getElementById("playlistName");

const playlistList = document.getElementById("playlistList");


/* =========================================================
   SONG DATABASE
   =========================================================

   IMPORTANT:
   Songs are now discovered automatically from:

       music/

   You no longer need to type every MP3 here.

   You can still add special artist information below.
   ========================================================= */

let songs = [];

/* =========================================================
   STATE
   ========================================================= */

let browserSongs = [];

let currentSongIndex = -1;

let currentPage = "home";

let currentPlaylistId = null;

let isShuffle = false;

let repeatMode = "off";

let recentlyPlayed = JSON.parse(
    localStorage.getItem("vibe_recent") || "[]"
);

let likedSongs = JSON.parse(
    localStorage.getItem("vibe_liked") || "[]"
);

let playlists = JSON.parse(
    localStorage.getItem("vibe_playlists") || "[]"
);


/* =========================================================
   UTILITIES
   ========================================================= */

function escapeHTML(text) {

    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function formatTime(seconds) {

    if (!Number.isFinite(seconds)) {
        return "0:00";
    }

    const mins = Math.floor(seconds / 60);

    const secs = Math.floor(seconds % 60)
        .toString()
        .padStart(2, "0");

    return `${mins}:${secs}`;

}


function showToast(message) {

    if (!toast) return;

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2200);

}


function getAllSongs() {

    return [
        ...songs,
        ...browserSongs
    ];

}


function getCurrentSong() {

    const allSongs = getAllSongs();

    return allSongs[currentSongIndex] || null;

}


/* =========================================================
   GET TITLE FROM FILENAME
   ========================================================= */

function filenameToTitle(filename) {

    return filename
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, letter =>
            letter.toUpperCase()
        );

}


/* =========================================================
   LOAD ALL SONGS FROM GITHUB /music/
   =========================================================

   This is the important part.

   GitHub Pages cannot directly list files inside a folder,
   so we ask GitHub's public repository API for the contents
   of the music folder.

   Your repository:

   abishekinstinct/Music-Fall
   ========================================================= */

/* =========================================================
   LOAD SONGS FROM song.json
   ========================================================= */

const MUSIC_BASE_URL =
    "https://abishekinstinct.github.io/Music-Fall/";

const SONG_JSON_URL =
    MUSIC_BASE_URL + "songs.json";


function makeAbsoluteAudioURL(path) {

    if (!path) {
        return "";
    }

    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    return new URL(
        path.replace(/^\/+/, ""),
        MUSIC_BASE_URL
    ).href;

}


async function loadSongsFromJSON() {

    try {

        const response = await fetch(
            SONG_JSON_URL + "?v=" + Date.now(),
            {
                cache: "no-store"
            }
        );


        if (!response.ok) {

            throw new Error(
                `song.json returned HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        if (!Array.isArray(data)) {

            throw new Error(
                "song.json must contain an array."
            );

        }


        songs = data
            .filter(song =>
                song &&
                song.title &&
                song.audio
            )
            .map((song, index) => {

                return {

                    id:
                        String(
                            song.id ??
                            `song-${index + 1}`
                        ),

                    title:
                        String(
                            song.title
                        ),

                    artist:
                        String(
                            song.artist ||
                            "Unknown Artist"
                        ),

                    album:
                        String(
                            song.album ||
                            "My Music"
                        ),

                    cover:
                        song.cover
                            ? makeAbsoluteAudioURL(
                                song.cover
                            )
                            : "",

                    src:
                        makeAbsoluteAudioURL(
                            song.audio
                        )

                };

            });


        console.log(
            `VibeMusic loaded ${songs.length} songs from song.json.`
        );


        renderCurrentPage();

        updatePlayerUI();


        if (songs.length === 0) {

            showToast(
                "No songs found in song.json"
            );

        } else {

            showToast(
                `${songs.length} songs loaded`
            );

        }


    } catch (error) {

        console.error(
            "Could not load song.json:",
            error
        );


        songs = [];


        renderCurrentPage();

        updatePlayerUI();


        showToast(
            "Could not load song.json. Check GitHub."
        );

    }

}


/* =========================================================
   SAVE DATA
   ========================================================= */

function saveLiked() {

    localStorage.setItem(
        "vibe_liked",
        JSON.stringify(likedSongs)
    );

}


function saveRecent() {

    localStorage.setItem(
        "vibe_recent",
        JSON.stringify(recentlyPlayed)
    );

}


function savePlaylists() {

    localStorage.setItem(
        "vibe_playlists",
        JSON.stringify(playlists)
    );

}


/* =========================================================
   PLAY SONG
   ========================================================= */

function playSong(index) {

    const allSongs = getAllSongs();

    if (!allSongs[index]) {
        return;
    }


    currentSongIndex = index;

    const song = allSongs[index];


    audio.src = song.src;

    audio.load();


    updatePlayerUI();

    renderCurrentPage();


    audio.play()
        .then(() => {

            addToRecentlyPlayed(song.id);

            updatePlayerUI();

            renderCurrentPage();

        })
        .catch(error => {

            console.error(
                "Playback error:",
                error
            );

            showToast(
                "Could not play this song. Check the MP3 file."
            );

            updatePlayerUI();

        });

}


/* =========================================================
   PLAY / PAUSE SPECIFIC SONG
   ========================================================= */

function toggleSong(index) {

    const allSongs = getAllSongs();

    const song = allSongs[index];

    if (!song) {
        return;
    }


    /* Same song */

    if (currentSongIndex === index) {

        if (audio.paused) {

            audio.play()
                .catch(error =>
                    console.error(error)
                );

        } else {

            audio.pause();

        }

        return;
    }


    /* Different song */

    playSong(index);

}


/* =========================================================
   MAIN PLAYER BUTTON
   ========================================================= */

function togglePlay() {

    const allSongs = getAllSongs();


    if (!allSongs.length) {

        showToast(
            "No songs available"
        );

        return;

    }


    if (currentSongIndex === -1) {

        playSong(0);

        return;

    }


    if (audio.paused) {

        audio.play()
            .catch(error =>
                console.error(error)
            );

    } else {

        audio.pause();

    }

}


playButton.addEventListener(
    "click",
    togglePlay
);


/* =========================================================
   PLAYER UI
   ========================================================= */

function updatePlayerUI() {

    const song = getCurrentSong();


    if (!song) {

        playerTitle.textContent =
            "Nothing Playing";

        playerArtist.textContent =
            "Select a song";

        playerCover.innerHTML =
            "<span>♫</span>";

        playButton.textContent =
            "▶";

        playButton.classList.remove(
            "playing"
        );

        likeButton.textContent =
            "♡";

        likeButton.classList.remove(
            "liked"
        );

        return;

    }


    playerTitle.textContent =
        song.title;

    playerArtist.textContent =
        song.artist;


    if (song.cover) {

        playerCover.innerHTML = `
            <img
                src="${song.cover}"
                alt="${escapeHTML(song.title)}">
        `;

    } else {

        playerCover.innerHTML =
            "<span>♫</span>";

    }


    /* MAIN PLAYER */

    if (audio.paused) {

        playButton.textContent =
            "▶";

        playButton.classList.remove(
            "playing"
        );

    } else {

        playButton.textContent =
            "⏸";

        playButton.classList.add(
            "playing"
        );

    }


    /* FAVORITE */

    const liked =
        likedSongs.includes(song.id);

    likeButton.textContent =
        liked
            ? "♥"
            : "♡";

    likeButton.classList.toggle(
        "liked",
        liked
    );

}


/* =========================================================
   PREVIOUS
   ========================================================= */

previousButton.addEventListener(
    "click",
    () => {

        const allSongs =
            getAllSongs();

        if (!allSongs.length) {
            return;
        }


        if (audio.currentTime > 3) {

            audio.currentTime = 0;

            return;

        }


        let index =
            currentSongIndex - 1;


        if (index < 0) {

            index =
                allSongs.length - 1;

        }


        playSong(index);

    }
);


/* =========================================================
   NEXT
   ========================================================= */

function playNext() {

    const allSongs =
        getAllSongs();


    if (!allSongs.length) {
        return;
    }


    if (isShuffle) {

        if (allSongs.length === 1) {

            playSong(0);

            return;

        }


        let newIndex;


        do {

            newIndex =
                Math.floor(
                    Math.random() *
                    allSongs.length
                );

        } while (
            newIndex ===
            currentSongIndex
        );


        playSong(newIndex);

        return;

    }


    let nextIndex =
        currentSongIndex + 1;


    if (
        nextIndex >=
        allSongs.length
    ) {

        nextIndex = 0;

    }


    playSong(nextIndex);

}


nextButton.addEventListener(
    "click",
    playNext
);


/* =========================================================
   AUDIO EVENTS
   ========================================================= */

audio.addEventListener(
    "play",
    () => {

        updatePlayerUI();

        renderCurrentPage();

    }
);


audio.addEventListener(
    "pause",
    () => {

        updatePlayerUI();

        renderCurrentPage();

    }
);


audio.addEventListener(
    "timeupdate",
    () => {

        if (!audio.duration) {
            return;
        }


        progressBar.value =
            (
                audio.currentTime /
                audio.duration
            ) * 100;


        currentTime.textContent =
            formatTime(
                audio.currentTime
            );


        duration.textContent =
            formatTime(
                audio.duration
            );

    }
);


audio.addEventListener(
    "loadedmetadata",
    () => {

        duration.textContent =
            formatTime(
                audio.duration
            );

    }
);


audio.addEventListener(
    "ended",
    () => {

        if (
            repeatMode ===
            "one"
        ) {

            audio.currentTime = 0;

            audio.play();

            return;

        }


        playNext();

    }
);


/* =========================================================
   PROGRESS
   ========================================================= */

progressBar.addEventListener(
    "input",
    () => {

        if (!audio.duration) {
            return;
        }


        audio.currentTime =
            (
                Number(
                    progressBar.value
                ) / 100
            ) *
            audio.duration;

    }
);


/* =========================================================
   SHUFFLE
   ========================================================= */

shuffleButton.addEventListener(
    "click",
    () => {

        isShuffle =
            !isShuffle;


        shuffleButton.classList.toggle(
            "active",
            isShuffle
        );


        shuffleButton.setAttribute(
            "aria-pressed",
            String(isShuffle)
        );


        showToast(
            isShuffle
                ? "Shuffle ON"
                : "Shuffle OFF"
        );

    }
);


/* =========================================================
   REPEAT
   ========================================================= */

repeatButton.addEventListener(
    "click",
    () => {

        if (
            repeatMode ===
            "off"
        ) {

            repeatMode =
                "all";

        } else if (
            repeatMode ===
            "all"
        ) {

            repeatMode =
                "one";

        } else {

            repeatMode =
                "off";

        }


        repeatButton.classList.toggle(
            "active",
            repeatMode !== "off"
        );


        if (
            repeatMode ===
            "one"
        ) {

            repeatButton.title =
                "Repeat current song";

        } else if (
            repeatMode ===
            "all"
        ) {

            repeatButton.title =
                "Repeat all";

        } else {

            repeatButton.title =
                "Repeat off";

        }


        showToast(
            repeatMode === "one"
                ? "Repeat One"
                : repeatMode === "all"
                    ? "Repeat All"
                    : "Repeat OFF"
        );

    }
);


/* =========================================================
   VOLUME
   ========================================================= */

audio.volume = 0.8;


volumeSlider.addEventListener(
    "input",
    () => {

        audio.volume =
            Number(
                volumeSlider.value
            );

        audio.muted = false;


        muteButton.textContent =
            audio.volume === 0
                ? "🔇"
                : "🔊";

    }
);


muteButton.addEventListener(
    "click",
    () => {

        audio.muted =
            !audio.muted;


        muteButton.textContent =
            audio.muted
                ? "🔇"
                : "🔊";

    }
);


/* =========================================================
   FAVORITES
   ========================================================= */

function toggleLike(songId) {

    if (
        likedSongs.includes(
            songId
        )
    ) {

        likedSongs =
            likedSongs.filter(
                id =>
                    id !== songId
            );

    } else {

        likedSongs.push(
            songId
        );

    }


    saveLiked();

    updatePlayerUI();

    renderCurrentPage();

}


likeButton.addEventListener(
    "click",
    () => {

        const song =
            getCurrentSong();

        if (!song) {
            return;
        }


        toggleLike(
            song.id
        );

    }
);


/* =========================================================
   RECENTLY PLAYED
   ========================================================= */

function addToRecentlyPlayed(
    songId
) {

    recentlyPlayed =
        recentlyPlayed.filter(
            id =>
                id !== songId
        );


    recentlyPlayed.unshift(
        songId
    );


    recentlyPlayed =
        recentlyPlayed.slice(
            0,
            30
        );


    saveRecent();

}


/* =========================================================
   SEARCH
   ========================================================= */

searchInput.addEventListener(
    "input",
    () => {

        renderCurrentPage();

    }
);


clearSearch.addEventListener(
    "click",
    () => {

        searchInput.value = "";

        renderCurrentPage();

        searchInput.focus();

    }
);


/* =========================================================
   FILTER
   ========================================================= */

function getFilteredSongs(
    list
) {

    const query =
        searchInput.value
            .trim()
            .toLowerCase();


    if (!query) {
        return list;
    }


    return list.filter(
        song =>

            song.title
                .toLowerCase()
                .includes(query)

            ||

            song.artist
                .toLowerCase()
                .includes(query)
    );

}


/* =========================================================
   SONG ROW
   ========================================================= */

function createSongRow(
    song,
    actualIndex
) {

    const isCurrent =
        currentSongIndex ===
        actualIndex;


    const isPlaying =
        isCurrent &&
        !audio.paused;


    const liked =
        likedSongs.includes(
            song.id
        );


    return `

        <div
            class="
                song-row
                ${isCurrent ? "currently-playing" : ""}
                ${isPlaying ? "is-playing" : ""}
            "
            data-index="${actualIndex}"
            role="button"
            tabindex="0"
        >

            <div class="song-number">

                ${
                    isPlaying
                        ? `
                            <div class="playing-bars">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                          `
                        : `
                            <span class="normal-number">
                                ${actualIndex + 1}
                            </span>
                          `
                }

            </div>


            <div class="song-cover">

                ${
                    song.cover
                        ? `
                            <img
                                src="${song.cover}"
                                alt="">
                          `
                        : `
                            <span>♫</span>
                          `
                }

            </div>


            <div class="song-details">

                <strong>
                    ${escapeHTML(
                        song.title
                    )}
                </strong>

                <span>
                    ${escapeHTML(
                        song.artist
                    )}
                </span>

            </div>


            <div class="song-playing-label">

                ${
                    isPlaying
                        ? "NOW PLAYING"
                        : ""
                }

            </div>


            <button
                class="
                    row-like
                    ${liked ? "liked" : ""}
                "
                data-like="${actualIndex}"
                title="Favorite"
                type="button"
            >
                ${liked ? "♥" : "♡"}
            </button>


            <button
                class="
                    row-play
                    ${isPlaying ? "playing" : ""}
                "
                data-play="${actualIndex}"
                title="${
                    isPlaying
                        ? "Pause"
                        : "Play"
                }"
                type="button"
            >

                ${
                    isPlaying
                        ? "⏸"
                        : "▶"
                }

            </button>

        </div>

    `;

}


/* =========================================================
   SONG LIST
   ========================================================= */

function renderSongList(
    list,
    title = "Your Music"
) {

    const allSongs =
        getAllSongs();


    if (!list.length) {

        return `

            <section class="music-section">

                <div class="section-heading">

                    <div>

                        <h2>
                            ♫ ${escapeHTML(title)}
                        </h2>

                    </div>

                </div>


                <div class="empty-state">

                    <div class="empty-icon">
                        ♫
                    </div>

                    <h3>
                        No songs found
                    </h3>

                    <p>
                        ${
                            allSongs.length
                                ? "No songs match your search."
                                : 'Add MP3 files to the "music" folder.'
                        }
                    </p>

                </div>

            </section>

        `;

    }


    return `

        <section class="music-section">

            <div class="section-heading">

                <div>

                    <h2>
                        ♫ ${escapeHTML(title)}
                    </h2>

                    <span>
                        ${list.length} songs
                    </span>

                </div>


                <button
                    class="play-all-btn"
                    id="playAllButton"
                    type="button"
                >
                    ▶ Play All
                </button>

            </div>


            <div class="song-list">

                ${
                    list.map(song => {

                        const index =
                            allSongs.findIndex(
                                s =>
                                    s.id ===
                                    song.id
                            );

                        return createSongRow(
                            song,
                            index
                        );

                    }).join("")
                }

            </div>

        </section>

    `;

}


/* =========================================================
   HOME
   ========================================================= */

function renderHome() {

    const filtered =
        getFilteredSongs(
            getAllSongs()
        );


    content.innerHTML = `

        <div class="hero">

            <div>

                <span class="hero-small">
                    YOUR MUSIC
                </span>

                <h1>
                    Feel the music.
                </h1>

                <p>
                    Your personal music collection,
                    all in one place.
                </p>

            </div>


            <button
                class="hero-play"
                id="heroPlay"
                type="button"
            >
                
            </button>

        </div>


        ${renderSongList(
            filtered,
            "Your Songs"
        )}

    `;


    document
        .getElementById("heroPlay")
        ?.addEventListener(
            "click",
            () => {

                if (
                    currentSongIndex === -1
                ) {

                    if (
                        getAllSongs().length
                    ) {

                        playSong(0);

                    }

                } else {

                    togglePlay();

                }

            }
        );

}


/* =========================================================
   LIBRARY
   ========================================================= */

function renderLibrary() {

    const filtered =
        getFilteredSongs(
            getAllSongs()
        );


    content.innerHTML =
        renderSongList(
            filtered,
            "Your Library"
        );

}


/* =========================================================
   FAVORITES
   ========================================================= */

function renderLiked() {

    const allSongs =
        getAllSongs();


    const liked =
        likedSongs
            .map(id =>
                allSongs.find(
                    song =>
                        song.id === id
                )
            )
            .filter(Boolean);


    content.innerHTML =
        renderSongList(
            getFilteredSongs(
                liked
            ),
            "Favorites"
        );

}


/* =========================================================
   RECENTLY PLAYED
   ========================================================= */

function renderRecent() {

    const allSongs =
        getAllSongs();


    const recent =
        recentlyPlayed
            .map(id =>
                allSongs.find(
                    song =>
                        song.id === id
                )
            )
            .filter(Boolean);


    content.innerHTML =
        renderSongList(
            getFilteredSongs(
                recent
            ),
            "Recently Played"
        );

}


/* =========================================================
   PLAYLIST PAGE
   ========================================================= */

function renderPlaylist(
    playlistId
) {

    const playlist =
        playlists.find(
            p =>
                p.id === playlistId
        );


    if (!playlist) {

        currentPage =
            "home";

        renderHome();

        return;

    }


    const allSongs =
        getAllSongs();


    const playlistSongs =
        playlist.songIds
            .map(id =>
                allSongs.find(
                    song =>
                        song.id === id
                )
            )
            .filter(Boolean);


    const filtered =
        getFilteredSongs(
            playlistSongs
        );


    content.innerHTML = `

        <section class="playlist-page">

            <div class="playlist-header">

                <div class="playlist-art">
                    ♫
                </div>

                <div>

                    <span>
                        PLAYLIST
                    </span>

                    <h1>
                        ${escapeHTML(
                            playlist.name
                        )}
                    </h1>

                    <p>
                        ${playlistSongs.length}
                        songs
                    </p>

                </div>

            </div>


            <div class="playlist-actions">

                <button
                    class="play-all-btn"
                    id="playlistPlayAll"
                    type="button"
                >
                    ▶ Play Playlist
                </button>


                <button
                    class="delete-playlist-btn"
                    id="deletePlaylist"
                    type="button"
                >
                    Delete Playlist
                </button>

            </div>


            ${renderSongList(
                filtered,
                ""
            )}

        </section>

    `;


    document
        .getElementById(
            "playlistPlayAll"
        )
        ?.addEventListener(
            "click",
            () => {

                if (
                    !playlistSongs.length
                ) {
                    return;
                }


                const first =
                    playlistSongs[0];


                const index =
                    allSongs.findIndex(
                        song =>
                            song.id ===
                            first.id
                    );


                if (index !== -1) {

                    playSong(index);

                }

            }
        );


    document
        .getElementById(
            "deletePlaylist"
        )
        ?.addEventListener(
            "click",
            () => {

                playlists =
                    playlists.filter(
                        p =>
                            p.id !==
                            playlist.id
                    );


                savePlaylists();

                currentPage =
                    "home";

                currentPlaylistId =
                    null;


                renderPlaylistSidebar();

                renderCurrentPage();


                showToast(
                    "Playlist deleted"
                );

            }
        );

}


/* =========================================================
   RENDER CURRENT PAGE
   ========================================================= */

function renderCurrentPage() {

    if (
        currentPage ===
        "home"
    ) {

        renderHome();

    } else if (
        currentPage ===
        "library"
    ) {

        renderLibrary();

    } else if (
        currentPage ===
        "liked"
    ) {

        renderLiked();

    } else if (
        currentPage ===
        "recent"
    ) {

        renderRecent();

    } else if (
        currentPage ===
        "playlist"
    ) {

        renderPlaylist(
            currentPlaylistId
        );

    }

}


/* =========================================================
   SIDEBAR NAVIGATION
   ========================================================= */

document
    .querySelectorAll(".nav-btn")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

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


                currentPage =
                    button.dataset.page;


                currentPlaylistId =
                    null;


                renderCurrentPage();

            }
        );

    });


/* =========================================================
   SONG ROW EVENTS
   ========================================================= */

content.addEventListener(
    "click",
    event => {

        /* Favorite */

        const like =
            event.target.closest(
                "[data-like]"
            );


        if (like) {

            event.stopPropagation();


            const index =
                Number(
                    like.dataset.like
                );


            const song =
                getAllSongs()[index];


            if (song) {

                toggleLike(
                    song.id
                );

            }


            return;

        }


        /* Play / pause button */

        const play =
            event.target.closest(
                "[data-play]"
            );


        if (play) {

            event.stopPropagation();


            toggleSong(
                Number(
                    play.dataset.play
                )
            );


            return;

        }


        /* Whole row */

        const row =
            event.target.closest(
                ".song-row"
            );


        if (row) {

            toggleSong(
                Number(
                    row.dataset.index
                )
            );

        }

    }
);


/* =========================================================
   KEYBOARD SUPPORT FOR SONG ROWS
   ========================================================= */

content.addEventListener(
    "keydown",
    event => {

        const row =
            event.target.closest(
                ".song-row"
            );


        if (!row) {
            return;
        }


        if (
            event.key ===
            "Enter"
            ||
            event.key ===
            " "
        ) {

            event.preventDefault();


            toggleSong(
                Number(
                    row.dataset.index
                )
            );

        }

    }
);


/* =========================================================
   PLAY ALL
   ========================================================= */

content.addEventListener(
    "click",
    event => {

        if (
            event.target.id !==
            "playAllButton"
        ) {
            return;
        }


        const all =
            getAllSongs();


        if (all.length) {

            playSong(0);

        }

    }
);


/* =========================================================
   PLAYLIST SIDEBAR
   ========================================================= */

function renderPlaylistSidebar() {

    playlistList.innerHTML = "";


    playlists.forEach(
        playlist => {

            const button =
                document.createElement(
                    "button"
                );


            button.className =
                "sidebar-playlist";


            button.innerHTML = `

                <span>♫</span>

                <span>
                    ${escapeHTML(
                        playlist.name
                    )}
                </span>

            `;


            button.addEventListener(
                "click",
                () => {

                    currentPage =
                        "playlist";

                    currentPlaylistId =
                        playlist.id;


                    document
                        .querySelectorAll(
                            ".nav-btn"
                        )
                        .forEach(
                            btn =>
                                btn.classList.remove(
                                    "active"
                                )
                        );


                    renderCurrentPage();

                }
            );


            playlistList.appendChild(
                button
            );

        }
    );

}


/* =========================================================
   PLAYLIST SONG SELECTOR
   ========================================================= */

function preparePlaylistDialog() {

    let selector =
        document.getElementById(
            "playlistSongSelector"
        );


    if (!selector) {

        selector =
            document.createElement(
                "div"
            );


        selector.id =
            "playlistSongSelector";


        selector.className =
            "playlist-song-selector";


        const buttons =
            playlistForm.querySelector(
                ".dialog-buttons"
            );


        playlistForm.insertBefore(
            selector,
            buttons
        );

    }


    const allSongs =
        getAllSongs();


    selector.innerHTML = `

        <h3>
            Add songs to playlist
        </h3>

        <p>
            Select songs from your existing library.
        </p>

        <div class="playlist-checklist">

            ${
                allSongs.length

                    ? allSongs.map(song => `

                        <label
                            class="playlist-check"
                        >

                            <input
                                type="checkbox"
                                value="${escapeHTML(song.id)}"
                            >

                            <span
                                class="check-cover"
                            >
                                ♫
                            </span>

                            <span>

                                <strong>
                                    ${escapeHTML(
                                        song.title
                                    )}
                                </strong>

                                <small>
                                    ${escapeHTML(
                                        song.artist
                                    )}
                                </small>

                            </span>

                        </label>

                    `).join("")

                    : `

                        <div class="empty-playlist">
                            Your library is empty.
                        </div>

                    `
            }

        </div>

    `;

}


/* =========================================================
   CREATE PLAYLIST
   ========================================================= */

createPlaylist.addEventListener(
    "click",
    () => {

        playlistName.value = "";

        preparePlaylistDialog();

        playlistDialog.showModal();

    }
);


playlistForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();


        const name =
            playlistName.value.trim();


        if (!name) {
            return;
        }


        const checked =
            [
                ...document.querySelectorAll(
                    "#playlistSongSelector input[type='checkbox']:checked"
                )
            ];


        const songIds =
            checked.map(
                checkbox =>
                    checkbox.value
            );


        const playlist = {

            id:
                "playlist-" +
                Date.now(),

            name,

            songIds

        };


        playlists.push(
            playlist
        );


        savePlaylists();


        playlistDialog.close();


        renderPlaylistSidebar();


        showToast(
            songIds.length
                ? `${name} created with ${songIds.length} songs`
                : `${name} created`
        );

    }
);


/* =========================================================
   ADD LOCAL SONGS
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

        selectedFiles.innerHTML = "";


        const files =
            [...songFiles.files];


        saveSongs.disabled =
            files.length === 0;


        files.forEach(
            file => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "selected-file";


                item.textContent =
                    `🎵 ${file.name}`;


                selectedFiles.appendChild(
                    item
                );

            }
        );

    }
);


saveSongs.addEventListener(
    "click",
    event => {

        event.preventDefault();


        const files =
            [...songFiles.files];


        files.forEach(
            file => {

                const id =
                    "local-" +
                    Date.now() +
                    "-" +
                    Math.random();


                browserSongs.push({

                    id,

                    title:
                        file.name.replace(
                            /\.[^/.]+$/,
                            ""
                        ),

                    artist:
                        "Local Music",

                    src:
                        URL.createObjectURL(
                            file
                        )

                });

            }
        );


        showToast(
            `${files.length} song(s) added`
        );


        addSongDialog.close();


        renderCurrentPage();

    }
);


/* =========================================================
   MODERN PLAYER VISUAL FIXES
   ========================================================= */

const playerStyle =
    document.createElement("style");


playerStyle.textContent = `

    /* Main play button */

    #playButton.playing {
        background: linear-gradient(
            135deg,
            #b14cff,
            #e43cff
        ) !important;

        color: white !important;

        transform: scale(1.06);

        box-shadow:
            0 0 0 5px rgba(180, 70, 255, 0.12),
            0 8px 25px rgba(180, 70, 255, 0.35);
    }


    /* Shuffle / repeat active */

    #shuffleButton.active,
    #repeatButton.active {
        color: #d35cff !important;

        background: rgba(
            190,
            70,
            255,
            0.14
        ) !important;

        box-shadow:
            0 0 15px rgba(
                190,
                70,
                255,
                0.18
            );
    }


    /* Playing song */

    .song-row.currently-playing {

        border-color:
            rgba(196, 76, 255, 0.65) !important;

        background:
            linear-gradient(
                90deg,
                rgba(175, 60, 255, 0.18),
                rgba(110, 30, 180, 0.08)
            ) !important;

        box-shadow:
            inset 3px 0 0 #c34cff,
            0 4px 20px rgba(
                150,
                40,
                220,
                0.10
            );

    }


    .song-row.is-playing
    .song-details strong {

        color: #d15cff !important;

    }


    /* Right side play button */

    .row-play.playing {

        background:
            linear-gradient(
                135deg,
                #a93fff,
                #e33fff
            ) !important;

        color: white !important;

        transform: scale(1.05);

        box-shadow:
            0 0 16px rgba(
                190,
                60,
                255,
                0.38
            );

    }


    /* NOW PLAYING */

    .song-playing-label {

        color: #cf59ff;

        font-size: 10px;

        font-weight: 800;

        letter-spacing: 1px;

    }


    /* Animated playing bars */

    .playing-bars {

        display: flex;

        align-items: flex-end;

        justify-content: center;

        gap: 3px;

        height: 20px;

    }


    .playing-bars span {

        width: 3px;

        border-radius: 4px;

        background: #d052ff;

        animation:
            vibeBars
            0.8s
            ease-in-out
            infinite alternate;

    }


    .playing-bars span:nth-child(1) {
        height: 9px;
        animation-delay: 0s;
    }


    .playing-bars span:nth-child(2) {
        height: 18px;
        animation-delay: 0.2s;
    }


    .playing-bars span:nth-child(3) {
        height: 12px;
        animation-delay: 0.4s;
    }


    @keyframes vibeBars {

        from {
            transform: scaleY(0.45);
        }

        to {
            transform: scaleY(1);
        }

    }


    /* Make entire row obviously clickable */

    .song-row {

        cursor: pointer;

    }


    .song-row:focus-visible {

        outline:
            2px solid #c44dff;

        outline-offset: 2px;

    }


    /* Playlist selector */

    .playlist-checklist {

        max-height: 320px;

        overflow-y: auto;

        display: flex;

        flex-direction: column;

        gap: 7px;

        margin-top: 12px;

    }


    .playlist-check {

        display: flex;

        align-items: center;

        gap: 10px;

        padding: 9px;

        border-radius: 10px;

        cursor: pointer;

        background: rgba(
            255,
            255,
            255,
            0.035
        );

        transition:
            background .2s,
            transform .2s;

    }


    .playlist-check:hover {

        background: rgba(
            190,
            70,
            255,
            0.12
        );

        transform: translateX(2px);

    }


    .playlist-check input {

        accent-color: #c44dff;

    }


    .playlist-check span:last-child {

        display: flex;

        flex-direction: column;

    }


    .playlist-check small {

        opacity: .6;

        margin-top: 2px;

    }


    .check-cover {

        width: 35px;

        height: 35px;

        border-radius: 8px;

        display: grid;

        place-items: center;

        background:
            linear-gradient(
                135deg,
                #8e35c9,
                #d93fa9
            );

        color: white;

    }

`;


document.head.appendChild(
    playerStyle
);


/* =========================================================
   INITIALIZE
   ========================================================= */

renderPlaylistSidebar();

renderCurrentPage();

updatePlayerUI();

/*
 * Load ALL songs from GitHub.
 */
loadSongsFromJSON();
