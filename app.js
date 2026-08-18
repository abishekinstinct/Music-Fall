const audio = document.getElementById("audioPlayer");

let songs = [];
let currentIndex = -1;

let shuffle = false;
let repeat = false;

let queue = [];

let likedSongs =
    new Set(
        JSON.parse(
            localStorage.getItem("likedSongs") || "[]"
        )
    );

let playlists =
    JSON.parse(
        localStorage.getItem("playlists") || "[]"
    );

let recentlyPlayed =
    JSON.parse(
        localStorage.getItem("recentlyPlayed") || "[]"
    );


/* =========================
   HELPERS
========================= */

function formatTime(seconds) {

    if (!Number.isFinite(seconds)) {
        return "0:00";
    }

    const minutes =
        Math.floor(seconds / 60);

    const secs =
        Math.floor(seconds % 60)
            .toString()
            .padStart(2, "0");

    return `${minutes}:${secs}`;
}


function saveData() {

    localStorage.setItem(
        "likedSongs",
        JSON.stringify([...likedSongs])
    );

    localStorage.setItem(
        "playlists",
        JSON.stringify(playlists)
    );

    localStorage.setItem(
        "recentlyPlayed",
        JSON.stringify(recentlyPlayed)
    );
}


function escapeHTML(text) {

    return String(text)
        .replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char]));
}


/* =========================
   LOAD SONG DATABASE
========================= */

async function loadSongs() {

    try {

        const response =
            await fetch("songs.json");

        songs =
            await response.json();

        renderHome();

        renderPlaylists();

    } catch (error) {

        console.error(error);

        document.getElementById("content").innerHTML = `
            <div class="section">
                <h2>Unable to load songs</h2>
                <p>
                    Check that songs.json exists
                    in your GitHub repository.
                </p>
            </div>
        `;
    }
}


/* =========================
   SONG ART
========================= */

function albumArt(song, className = "album-art") {

    if (song.cover) {

        return `
            <div class="${className}">
                <img
                    src="${song.cover}"
                    style="width:100%;height:100%;object-fit:cover;border-radius:inherit;"
                >
            </div>
        `;

    }

    return `
        <div class="${className}">
            ♫
        </div>
    `;
}


/* =========================
   SONG CARD
========================= */

function songCard(song) {

    return `
        <article class="song-card">

            ${albumArt(song)}

            <button
                class="card-play"
                data-play="${song.id}"
            >
                ▶
            </button>

            <div class="song-name">
                ${escapeHTML(song.title)}
            </div>

            <div class="song-artist">
                ${escapeHTML(song.artist)}
            </div>

        </article>
    `;
}


/* =========================
   SONG ROW
========================= */

function songRow(song) {

    const isLiked =
        likedSongs.has(song.id);

    return `
        <div class="song-row">

            ${albumArt(song, "row-art")}

            <div>

                <div class="row-title">
                    ${escapeHTML(song.title)}
                </div>

                <div class="row-artist">
                    ${escapeHTML(song.artist)}
                </div>

            </div>

            <button
                class="row-button"
                data-like="${song.id}"
            >
                ${isLiked ? "♥" : "♡"}
            </button>

            <button
                class="row-button"
                data-play="${song.id}"
            >
                ▶
            </button>

        </div>
    `;
}


/* =========================
   SONG LIST
========================= */

function songList(list) {

    if (!list.length) {

        return `
            <div class="empty">
                <h3>No songs found</h3>

                <p>
                    Add songs using the
                    "Add Songs" button.
                </p>
            </div>
        `;
    }

    return `
        <div class="song-list">

            ${list.map(songRow).join("")}

        </div>
    `;
}


/* =========================
   HOME
========================= */

function renderHome() {

    const recent =
        recentlyPlayed
            .map(id =>
                songs.find(song => song.id == id)
            )
            .filter(Boolean)
            .slice(0, 6);


    document.getElementById("content").innerHTML = `

        <section class="hero">

            <div class="hero-content">

                <small>
                    YOUR PERSONAL MUSIC PLAYER
                </small>

                <h1>
                    Music that feels like you.
                </h1>

                <p>
                    Listen to your collection,
                    shuffle your favorites,
                    create playlists and
                    add new songs whenever you want.
                </p>

                <button
                    class="play-all"
                    id="playAll"
                >
                    ▶ Play All
                </button>

                <button
                    class="shuffle-all"
                    id="shuffleAll"
                >
                    🔀 Shuffle
                </button>

            </div>

        </section>


        ${
            recent.length
            ?
            `
            <section class="section">

                <div class="section-header">

                    <h2>
                        Recently Played
                    </h2>

                </div>

                <div class="song-grid">

                    ${recent.map(songCard).join("")}

                </div>

            </section>
            `
            :
            ""
        }


        <section class="section">

            <div class="section-header">

                <h2>
                    Your Music
                </h2>

                <span>
                    ${songs.length} songs
                </span>

            </div>

            ${songList(songs)}

        </section>
    `;


    document.getElementById("playAll")
        .onclick = () => {

            playList(songs);

        };


    document.getElementById("shuffleAll")
        .onclick = () => {

            shuffle = true;

            playRandom();

        };
}


/* =========================
   LIBRARY
========================= */

function renderLibrary() {

    const search =
        document.getElementById(
            "searchInput"
        ).value
        .toLowerCase();


    let results = songs;


    if (search) {

        results =
            songs.filter(song => {

                return (
                    song.title
                        .toLowerCase()
                        .includes(search)

                    ||

                    song.artist
                        .toLowerCase()
                        .includes(search)

                    ||

                    (song.album || "")
                        .toLowerCase()
                        .includes(search)
                );

            });

    }


    document.getElementById("content")
        .innerHTML = `

        <section class="section">

            <div class="section-header">

                <h2>
                    ${
                        search
                        ? "Search Results"
                        : "Your Library"
                    }
                </h2>

                <span>
                    ${results.length} songs
                </span>

            </div>

            ${songList(results)}

        </section>
    `;
}


/* =========================
   LIKED SONGS
========================= */

function renderLiked() {

    const liked =
        songs.filter(song =>
            likedSongs.has(song.id)
        );


    document.getElementById("content")
        .innerHTML = `

        <section class="section">

            <div class="section-header">

                <h2>
                    ❤️ Liked Songs
                </h2>

                <span>
                    ${liked.length}
                </span>

            </div>

            ${songList(liked)}

        </section>
    `;
}


/* =========================
   PLAY SONG
========================= */

function playSong(id) {

    const index =
        songs.findIndex(
            song => song.id == id
        );


    if (index === -1) return;


    currentIndex = index;


    const song =
        songs[index];


    if (!song.audio) {

        showToast(
            "This song doesn't have an audio URL yet."
        );

        return;
    }


    audio.src =
        song.audio;


    audio.play()
        .catch(() => {

            showToast(
                "Press Play to start the song."
            );

        });


    document.getElementById(
        "playerTitle"
    ).textContent =
        song.title;


    document.getElementById(
        "playerArtist"
    ).textContent =
        song.artist;


    document.getElementById(
        "likeButton"
    ).textContent =
        likedSongs.has(song.id)
        ? "♥"
        : "♡";


    const cover =
        document.getElementById(
            "playerCover"
        );


    if (song.cover) {

        cover.innerHTML =
            `<img src="${song.cover}"
            style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;

    } else {

        cover.innerHTML = "♫";

    }


    recentlyPlayed =
        [
            song.id,
            ...recentlyPlayed
                .filter(id =>
                    id !== song.id
                )
        ].slice(0, 20);


    saveData();

}


/* =========================
   PLAY LIST
========================= */

function playList(list) {

    queue =
        list.map(
            song => song.id
        );


    if (!queue.length) return;


    playSong(queue[0]);

}


/* =========================
   RANDOM
========================= */

function playRandom() {

    if (!songs.length) return;


    queue =
        songs.map(song => song.id);


    const randomIndex =
        Math.floor(
            Math.random() * queue.length
        );


    playSong(
        queue[randomIndex]
    );
}


/* =========================
   NEXT
========================= */

function nextSong() {

    if (!songs.length) return;


    if (repeat) {

        audio.currentTime = 0;

        audio.play();

        return;
    }


    if (!queue.length) {

        queue =
            songs.map(song =>
                song.id
            );
    }


    let position =
        queue.indexOf(
            songs[currentIndex]?.id
        );


    if (shuffle) {

        playRandom();

        return;
    }


    position++;


    if (
        position >=
        queue.length
    ) {

        position = 0;

    }


    playSong(
        queue[position]
    );
}


/* =========================
   PREVIOUS
========================= */

function previousSong() {

    if (!queue.length) {

        queue =
            songs.map(song =>
                song.id
            );

    }


    let position =
        queue.indexOf(
            songs[currentIndex]?.id
        );


    position--;


    if (position < 0) {

        position =
            queue.length - 1;

    }


    playSong(
        queue[position]
    );
}


/* =========================
   CONTROLS
========================= */

document.getElementById(
    "playButton"
).onclick = () => {

    if (currentIndex === -1) {

        playList(songs);

        return;

    }


    if (audio.paused) {

        audio.play();

    } else {

        audio.pause();

    }

};


document.getElementById(
    "nextButton"
).onclick =
    nextSong;


document.getElementById(
    "previousButton"
).onclick =
    previousSong;


document.getElementById(
    "shuffleButton"
).onclick = () => {

    shuffle = !shuffle;

    showToast(
        shuffle
        ? "Shuffle enabled"
        : "Shuffle disabled"
    );

};


document.getElementById(
    "repeatButton"
).onclick = () => {

    repeat = !repeat;

    showToast(
        repeat
        ? "Repeat enabled"
        : "Repeat disabled"
    );

};


document.getElementById(
    "likeButton"
).onclick = () => {

    if (currentIndex === -1)
        return;


    const id =
        songs[currentIndex].id;


    if (likedSongs.has(id)) {

        likedSongs.delete(id);

    } else {

        likedSongs.add(id);

    }


    saveData();


    document.getElementById(
        "likeButton"
    ).textContent =
        likedSongs.has(id)
        ? "♥"
        : "♡";

};


/* =========================
   AUDIO EVENTS
========================= */

audio.addEventListener(
    "play",
    () => {

        document.getElementById(
            "playButton"
        ).textContent = "❚❚";

    }
);


audio.addEventListener(
    "pause",
    () => {

        document.getElementById(
            "playButton"
        ).textContent = "▶";

    }
);


audio.addEventListener(
    "ended",
    nextSong
);


audio.addEventListener(
    "loadedmetadata",
    () => {

        document.getElementById(
            "duration"
        ).textContent =
            formatTime(
                audio.duration
            );

    }
);


audio.addEventListener(
    "timeupdate",
    () => {

        if (!audio.duration)
            return;


        const percentage =
            (
                audio.currentTime /
                audio.duration
            ) * 100;


        document.getElementById(
            "progressBar"
        ).value =
            percentage;


        document.getElementById(
            "currentTime"
        ).textContent =
            formatTime(
                audio.currentTime
            );

    }
);


/* =========================
   PROGRESS
========================= */

document.getElementById(
    "progressBar"
).oninput = event => {

    if (!audio.duration)
        return;


    audio.currentTime =
        (
            event.target.value /
            100
        ) *
        audio.duration;

};


/* =========================
   VOLUME
========================= */

audio.volume = 0.8;


document.getElementById(
    "volumeSlider"
).oninput = event => {

    audio.volume =
        event.target.value;

};


document.getElementById(
    "muteButton"
).onclick = () => {

    audio.muted =
        !audio.muted;


    document.getElementById(
        "muteButton"
    ).textContent =
        audio.muted
        ? "🔇"
        : "🔊";

};


/* =========================
   SEARCH
========================= */

document.getElementById(
    "searchInput"
).addEventListener(
    "input",
    renderLibrary
);


document.getElementById(
    "clearSearch"
).onclick = () => {

    document.getElementById(
        "searchInput"
    ).value = "";

    renderLibrary();

};


/* =========================
   NAVIGATION
========================= */

document.querySelectorAll(
    ".nav-btn"
).forEach(button => {

    button.onclick = () => {

        document.querySelectorAll(
            ".nav-btn"
        ).forEach(btn =>
            btn.classList.remove(
                "active"
            )
        );


        button.classList.add(
            "active"
        );


        const page =
            button.dataset.page;


        if (page === "home")
            renderHome();

        if (page === "library")
            renderLibrary();

        if (page === "liked")
            renderLiked();

    };

});


/* =========================
   CLICK SONG
========================= */

document.getElementById(
    "content"
).addEventListener(
    "click",
    event => {

        const playButton =
            event.target.closest(
                "[data-play]"
            );


        if (playButton) {

            playSong(
                playButton.dataset.play
            );

        }


        const likeButton =
            event.target.closest(
                "[data-like]"
            );


        if (likeButton) {

            const id =
                Number(
                    likeButton.dataset.like
                );


            if (likedSongs.has(id)) {

                likedSongs.delete(id);

            } else {

                likedSongs.add(id);

            }


            saveData();

            renderLibrary();

        }

    }
);


/* =========================
   ADD LOCAL SONGS
========================= */

document.getElementById(
    "addSongButton"
).onclick = () => {

    document.getElementById(
        "addSongDialog"
    ).showModal();

};


document.getElementById(
    "songFiles"
).onchange = event => {

    const files =
        [...event.target.files];


    document.getElementById(
        "selectedFiles"
    ).innerHTML =
        files.map(file => `
            <div class="selected-file">
                🎵 ${escapeHTML(file.name)}
            </div>
        `).join("");


    document.getElementById(
        "saveSongs"
    ).disabled =
        files.length === 0;

};


document.getElementById(
    "addSongForm"
).onsubmit = event => {

    if (
        event.submitter?.value !==
        "default"
    ) return;


    event.preventDefault();


    const files =
        [
            ...document.getElementById(
                "songFiles"
            ).files
        ];


    files.forEach(file => {

        const newSong = {

            id:
                Date.now() +
                Math.random(),

            title:
                file.name
                    .replace(
                        /\.[^/.]+$/,
                        ""
                    )
                    .replace(
                        /[_-]/g,
                        " "
                    ),

            artist:
                "Local Song",

            album:
                "My Library",

            audio:
                URL.createObjectURL(
                    file
                ),

            cover: ""

        };


        songs.push(
            newSong
        );

    });


    document.getElementById(
        "addSongDialog"
    ).close();


    document.getElementById(
        "songFiles"
    ).value = "";


    renderHome();


    showToast(
        `${files.length} song(s) added`
    );

};


/* =========================
   PLAYLISTS
========================= */

document.getElementById(
    "createPlaylist"
).onclick = () => {

    document.getElementById(
        "playlistDialog"
    ).showModal();

};


document.getElementById(
    "playlistForm"
).onsubmit = event => {

    if (
        event.submitter?.value !==
        "default"
    ) return;


    event.preventDefault();


    const name =
        document.getElementById(
            "playlistName"
        ).value.trim();


    if (!name) return;


    playlists.push({

        id: Date.now(),

        name: name,

        songIds: []

    });


    saveData();

    renderPlaylists();


    document.getElementById(
        "playlistDialog"
    ).close();


    document.getElementById(
        "playlistName"
    ).value = "";

};


/* =========================
   PLAYLIST DISPLAY
========================= */

function renderPlaylists() {

    const container =
        document.getElementById(
            "playlistList"
        );


    container.innerHTML =
        playlists.map(
            playlist => `

                <button
                    class="playlist-item"
                    data-playlist="${playlist.id}"
                >
                    ♫ ${escapeHTML(
                        playlist.name
                    )}
                </button>

            `
        ).join("");


    container
        .querySelectorAll(
            "[data-playlist]"
        )
        .forEach(button => {

            button.onclick = () => {

                const playlist =
                    playlists.find(
                        p =>
                            p.id ==
                            button.dataset.playlist
                    );


                if (!playlist)
                    return;


                const list =
                    playlist.songIds
                        .map(id =>
                            songs.find(
                                song =>
                                    song.id ==
                                    id
                            )
                        )
                        .filter(Boolean);


                document.getElementById(
                    "content"
                ).innerHTML = `

                    <section class="section">

                        <div class="section-header">

                            <h2>
                                ♫ ${
                                    escapeHTML(
                                        playlist.name
                                    )
                                }
                            </h2>

                        </div>

                        ${songList(list)}

                    </section>
                `;

            };

        });

}


/* =========================
   TOAST
========================= */

function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    setTimeout(() => {

        toast.classList.remove(
            "show"
        );

    }, 2500);

}


/* =========================
   PWA
========================= */

let deferredPrompt;


window.addEventListener(
    "beforeinstallprompt",
    event => {

        event.preventDefault();

        deferredPrompt =
            event;


        document.getElementById(
            "installButton"
        ).classList.remove(
            "hidden"
        );

    }
);


document.getElementById(
    "installButton"
).onclick = async () => {

    if (!deferredPrompt)
        return;


    deferredPrompt.prompt();

    deferredPrompt = null;

};


/* =========================
   START
========================= */

loadSongs();
