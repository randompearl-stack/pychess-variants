from __future__ import annotations


#  Deferred translations!
def _(message):
    return message


BLOG_TAGS = {
    "Announcement": _("Announcement"),
    "Tournament": _("Tournament"),
    "Blog": _("Blog"),
}

del _

BLOGS = [
    {
        "_id": "Bughouse_Chess",
        "date": "2025-01-25",
        "image": "/images/bughouse.jpg",
        "alt": "",
        "title": "The bugs are in the house!",
        "subtitle": "Bughouse chess has arrived",
        "author": "gbtami",
        "tags": ["Announcement"],
    },
    {
        "_id": "S-Chess_End-Game_Tables",
        "date": "2024.11.27",
        "image": "/images/SchessEGT/KEKR.png",
        "alt": "",
        "title": "S-Chess End-Game Tables",
        "subtitle": "Elephant vs Rook",
        "author": "HGMuller",
        "tags": ["Blog"],
    },
    {
        "_id": "Variant_Design_Contest",
        "date": "2024-11-14",
        "image": "/images/man-design-thinking.453x512.png",
        "alt": "",
        "title": "Variant Design Contest",
        "subtitle": "Create the best chess variant!",
        "author": "CouchTomato87",
        "tags": ["Announcement"],
    },
    {
        "_id": "Halloween_Update",
        "date": "2024-10-31",
        "image": "/images/witch.png",
        "alt": "",
        "title": "Halloween Update",
        "subtitle": "New variants and bug fixes",
        "author": "gbtami",
        "tags": ["Announcement"],
    },
    {
        "_id": "Late_Summer_Update",
        "date": "2024-08-11",
        "image": "/images/CVariantsGuide/Aliceroom3.jpg",
        "alt": "",
        "title": "Late Summer Update",
        "subtitle": "New variants and bug fixes",
        "author": "gbtami",
        "tags": ["Announcement"],
    },
    {
        "_id": "Alternate_variants",
        "date": "2024-07-11",
        "image": "/images/alt-server-boards.png",
        "alt": "",
        "title": "Alternate Variants",
        "subtitle": "An additional PyChess server for alternate variants",
        "author": "autocorr",
        "tags": ["Announcement"],
    },
    {
        "_id": "Internationalized_Pieces",
        "date": "2024-07-11",
        "image": "/images/Internationalized-Pieces.jpeg",
        "alt": "",
        "title": "Designing Internationalized Pieces for Eastern Forms of Chess",
        "subtitle": "My thought process on board game visual design",
        "author": "CouchTomato87",
        "tags": ["Blog"],
    },
    {
        "_id": "Spring_Update",
        "date": "2024-03-30",
        "image": "/images/Kuniyoshi_Utagawa_The_actor_17.jpg",
        "alt": "",
        "title": "Spring Update",
        "subtitle": "Happy Easter!",
        "author": "gbtami",
        "tags": ["Announcement"],
    },
    {
        "_id": "S-chess_endings_4",
        "date": "2024-03-01",
        "image": "/images/pexels-renato-conti-2677849.jpg",
        "alt": "",
        "title": "S-chess endings 4",
        "subtitle": "The Elephant",
        "author": "yasser-seirawan",
        "tags": ["Blog"],
    },
    {
        "_id": "Mid_Autumn_Festival",
        "date": "2024-02-13",
        "image": "/images/MidAutumnFestival/20210915_134909.jpg",
        "alt": "Mooncake placed next to set-up Xiangqi board",
        "title": "Mid Autumn Festival",
        "subtitle": "Celebrating the Mid-Autumn Moon Festival with Chess",
        "author": "CouchTomato87",
        "tags": ["Blog"],
    },
    {
        "_id": "S-chess_endings_3",
        "date": "2024-02-01",
        "image": "/images/hawk3.jpg",
        "alt": "",
        "title": "S-Chess Endings 3",
        "subtitle": "The Hawk",
        "author": "yasser-seirawan",
        "tags": ["Blog"],
    },
    {
        "_id": "hsl",
        "date": "2024-01-14",
        "image": "/images/hsl.png",
        "alt": "",
        "title": "Harbour Xiangqi League",
        "subtitle": "First Xiangqi tournament hosted on Pychess",
        "author": "CouchTomato87",
        "tags": ["Tournament"],
    },
    {
        "_id": "S-chess_endings_2",
        "date": "2024-01-01",
        "image": "/images/hawk.jpg",
        "alt": "",
        "title": "S-Chess Endings 2",
        "subtitle": "The Hawk",
        "author": "yasser-seirawan",
        "tags": ["Blog"],
    },
    {
        "_id": "Merry_Christmas",
        "date": "2023-12-24",
        "image": "/images/board/ataxx.png",
        "alt": "",
        "title": "Merry Christmas!",
        "subtitle": "Ataxx",
        "author": "gbtami",
        "tags": ["Announcement"],
    },
    {
        "_id": "S-chess_endings_1",
        "date": "2023-12-01",
        "image": "/images/elephant.jpg",
        "alt": "",
        "title": "S-chess endings 1",
        "subtitle": "The Elephant",
        "author": "yasser-seirawan",
        "tags": ["Blog"],
    },
    {
        "_id": "Correspondence_Chess",
        "date": "2023-11-10",
        "image": "/images/Postcard-for-correspondence-chess.png",
        "alt": "",
        "title": "Correspondence Chess",
        "subtitle": "You have time now",
        "author": "gbtami",
        "tags": ["Announcement"],
    },
    {
        "_id": "S-chess_ramblings",
        "date": "2023-11-03",
        "image": "/images/Hawk-Elephant.jpeg",
        "alt": "",
        "title": "S-chess ramblings",
        "subtitle": "S-chess ramblings",
        "author": "catask",
        "tags": ["Blog"],
    },
    {
        "_id": "More_variants",
        "date": "2023-10-19",
        "image": "/images/Mansindam.jpg",
        "alt": "",
        "title": "Autumn Update",
        "subtitle": "A slew of new variants!",
        "author": "CouchTomato87",
        "tags": ["Announcement"],
    },
    {
        "_id": "Summer_Update",
        "date": "2023-06-06",
        "image": "/images/puzzles.jpg",
        "alt": "",
        "title": "Summer Update",
        "subtitle": "New features and bug fixes",
        "author": "CouchTomato87",
        "tags": ["Announcement"],
    },
    {
        "_id": "Spartan_Chess",
        "date": "2023-04-01",
        "image": "/images/spartan-kick.jpg",
        "alt": "",
        "title": "Madness? This. Is. SPARTAN CHESS!",
        "subtitle": "Spartan chess has arrived",
        "author": "CouchTomato87",
        "tags": ["Announcement"],
    },
    {
        "_id": "Duck_Chess",
        "date": "2022-12-26",
        "image": "/images/Duck.jpg",
        "alt": "",
        "title": "A Christmas Present From Pychess",
        "subtitle": "Duck chess has arrived",
        "author": "e-pluszak",
        "tags": ["Announcement"],
    },
    {
        "_id": "Ouk_Chaktrang_Friendship_Between_Four_Countries_Tournament",
        "date": "2022-12-01",
        "image": "/images/four-countries.jpg",
        "alt": "",
        "title": "Ouk Chaktrang Friendship Between Four Countries Tournament",
        "subtitle": "Promoting Our Southeast Asian Brethren",
        "author": "furumin999",
        "tags": ["Tournament"],
    },
    {
        "_id": "Crazyhouse960_Tournament_Spring_Invitational_2022",
        "date": "2022-10-02",
        "image": "/images/one-flew-over-the-cuckoos-nest.jpg",
        "alt": "",
        "title": "Crazyhouse960 Tournament Spring Invitational 2022",
        "subtitle": "Final Standings",
        "author": "visualdennis",
        "tags": ["Tournament"],
    },
    {
        "_id": "NNUE_Everywhere",
        "date": "2022-08-04",
        "image": "/images/Weights-nn-62ef826d1a6d.png",
        "alt": "",
        "title": "Fairy-Stockfish on PyChess",
        "subtitle": "NNUE Everywhere",
        "author": "gbtami",
        "tags": ["Announcement"],
    },
    {
        "_id": "Serving_a_New_Variant",
        "date": "2022-02-01",
        "image": "/images/ChessTennis.jpg",
        "alt": "A few people play chess on a tennis court.",
        "title": "Tennis and chess",
        "subtitle": "Serving a New Variant",
        "author": "CouchTomato87",
        "tags": ["Announcement"],
    },
    {
        "_id": "Merry_Chakmas",
        "date": "2021-12-24",
        "image": "/images/QuetzalinTikal.png",
        "alt": "A quetzal, a Mesoamerican indigenous bird, flies in Tikal.",
        "title": "Christmas gift from PyChess",
        "subtitle": "Merry Chak-mas!",
        "author": "CouchTomato87",
        "tags": ["Announcement"],
    },
    {
        "_id": "Cold_Winter",
        "date": "2021-12-21",
        "image": "/images/board/ChakArt.jpg",
        "alt": "",
        "title": "Summary of latest changes",
        "subtitle": "Cold winter",
        "author": "CouchTomato87",
        "tags": ["Announcement"],
    },
    {
        "_id": "Hot_Summer",
        "date": "2021-09-02",
        "image": "/images/AngryBirds.png",
        "alt": "",
        "title": "New variant, new engine and more",
        "subtitle": "Hot summer",
        "author": "CouchTomato87",
        "tags": ["Announcement"],
    },
    {
        "_id": "Empire_Chess_and_Orda_Mirror_Have_Arrived",
        "date": "2021-07-30",
        "image": "/images/Darth-Vader-Comic.jpg",
        "alt": "",
        "title": "Empire Chess and Orda Mirror Have Arrived!",
        "subtitle": "New variants",
        "author": "CouchTomato87",
        "tags": ["Announcement"],
    },
    {
        "_id": "Shinobi_Arrives_in_Time_For_the_Sakura_Blossoms",
        "date": "2021-04-21",
        "image": "/icons/shinobi.svg",
        "alt": "",
        "title": "Shinobi Arrives in Time For the Sakura Blossoms",
        "subtitle": "Shinobi Chess has arrived!",
        "author": "CouchTomato87",
        "tags": ["Announcement"],
    },
    {
        "_id": "The_Winner_Is_Tasshaq",
        "date": "2021-03-28",
        "image": "/icons/Dobutsu.svg",
        "alt": "",
        "title": "And the winner is Tasshaq",
        "subtitle": "Subjective report on 1st Dōbutsu Tournament",
        "author": "gbtami",
        "tags": ["Tournament"],
    },
    {
        "_id": "New_Weapons_Arrived",
        "date": "2021-03-03",
        "image": "/images/RS-24.jpg",
        "alt": "",
        "title": "Atomic chess and Atomic960 are here",
        "subtitle": "New Weapons Arrived",
        "author": "gbtami",
        "tags": ["Announcement"],
    },
    {
        "_id": "Short_History_Of_Pychess",
        "date": "2021-02-27",
        "image": "/images/TomatoPlasticSet.svg",
        "alt": "",
        "title": "And Now for Something Completely Different",
        "subtitle": "Short History Of Pychess",
        "author": "gbtami",
        "tags": ["Blog"],
    },
    {
        "_id": "Dobutsu_Tournament",
        "date": "2021-02-04",
        "image": "/icons/Dobutsu.svg",
        "alt": "",
        "title": "PyChess tournament announcement",
        "subtitle": "The 1st Dōbutsu Tournament on PyChess",
        "author": "Tasshaq",
        "tags": ["Tournament"],
    },
]
