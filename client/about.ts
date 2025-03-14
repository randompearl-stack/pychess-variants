import { h, VNode } from 'snabbdom';

import { _ } from './i18n';
import { PyChessModel } from "./types";


export function aboutView(model: PyChessModel): VNode[] {
    const untitled = [
        _("\"To me, how we've got here today is owing to Stockfish in a BIG way. They rallied global volunteers to come together in the open-source spirit and create such a powerful engine for FREE. That's a lot of great minds and computing power they've managed to harness."),
        _("Then we've got Lichess to thank. Lichess was also born out of the same open-source spirit, and it too drew in great people as well. Once Lichess incorporated Stockfish as its brains, the rest is history."),
        _("Lichess enables the online, real-time, and competitive aspects of game-play. They also bring the enormous power of Stockfish to the masses, who can now benefit from it without configuring a local GUI. I believe this development turns out to be of great consequence and significance."),
        _("Later on, developers close to the Lichess project eventually extended Stockfish into Multivariant-Stockfish, in order to support Crazyhouse et al. The father of Fairy-Stockfish, Fabian, is also one of those devs (still) working on that fork, and he later took several steps further in terms of variant support and extensibility. Thus Fairy-Stockfish was born, so powerful because it builds on the Stockfish project."),
        _("Then comes our beloved pychess-variants, which again very smartly harnesses the underlying superpowers of the big projects. Same online, real-time, and competitive aspects. Same clean and familiar Lichess look and feel. Plus the power of Stockfish!\""),
    ]
    return [
        h('div.about', [
            h('img.center', { attrs: { src: `${model.assetURL}/favicon/favicon-96x96.png` } }),
            h('h1', { attrs: { align: 'center' } }, _('About pychess')),
            h('p', _('Pychess is a free, open-source chess server designed to play several chess variants.')),
            h('p', [
                // TODO Automate the generation of this list
                _("Currently supported games are "),
                h('a', { attrs: { href: 'https://www.pychess.org/variants/makruk' } }, 'Makruk'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/makpong' } }, 'Makpong'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/cambodian' } }, 'Ouk Chaktrang'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/sittuyin' } }, 'Sittuyin'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/asean' } }, 'ASEAN Chess'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/shogi' } }, 'Shogi'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/minishogi' } }, 'Minishogi'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/kyotoshogi' } }, 'Kyoto shogi'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/dobutsu' } }, 'Dobutsu shogi'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/gorogoroplus' } }, 'Gorogoro+ shogi'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/torishogi' } }, 'Tori shogi'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/cannonshogi' } }, 'Cannon shogi'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/xiangqi' } }, 'Xiangqi'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/manchu' } }, 'Manchu'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/janggi' } }, 'Janggi'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/minixiangqi' } }, 'Minixiangqi'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/placement' } }, 'Placement'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/bughouse' } }, 'Bughouse'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/crazyhouse' } }, 'Crazyhouse'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/atomic' } }, 'Atomic'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/3check' } }, 'Three check'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/kingofthehill' } }, 'King of the Hill'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/racingkings' } }, 'Racing Kings'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/antichess' } }, 'Antichess'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/horde' } }, 'Horde'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/duck' } }, 'Duck chess'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/alice' } }, 'Alice chess'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/fogofwar' } }, 'Fog of War'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/shatranj' } }, 'Shatranj'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/seirawan' } }, 'S-chess'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/capablanca' } }, 'Capablanca'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/grand' } }, 'Grand'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/shako' } }, 'Shako'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/shogun' } }, 'Shogun'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/mansindam' } }, 'Mansindam'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/orda' } }, 'Orda'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/khans' } }, 'Khan\'s chess'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/synochess' } }, 'Synochess'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/hoppelpoppel' } }, 'Hoppel-Poppel'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/shinobiplus' } }, 'Shinobi+'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/empire' } }, 'Empire'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/ordamirror' } }, 'Orda Mirror'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/chak' } }, 'Chak'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/chennis' } }, 'Chennis'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/spartan' } }, 'Spartan chess'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/shouse' } }, 'S-house (S-chess+Crazyhouse)'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/capahouse' } }, 'Capahouse (Capablanca+Crazyhouse)'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/grandhouse' } }, 'Grandhouse (Grand+Crazyhouse)'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/dragon' } }, 'Dragon chess'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/ataxx' } }, 'Ataxx'),
                ", ",
                h('a', { attrs: { href: 'https://www.pychess.org/variants/chess' } }, 'Chess'),
            ]),
            h('p', [
                _('Additionally, you can check the Chess960 option for Chess, Bughouse, Crazyhouse, Atomic, Three check, King of the Hill, Racing Kings, Antichess, Horde, S-chess, Capablanca, and Capahouse to start games from random positions with '),
                h('a', { attrs: { href: 'https://en.wikipedia.org/wiki/Fischer_random_chess#Castling_rules' } }, _('Chess960 castling rules.'))
            ]),
            h('p', [
                _('For move generation, validation, analysis, and engine play, we use '),
                h('a', { attrs: { href: 'https://github.com/ianfab/Fairy-Stockfish' } }, 'Fairy-Stockfish'),
                ", ",
                h('a', { attrs: { href: 'https://github.com/ianfab/fairy-stockfish.wasm' } }, 'fairy-stockfish.wasm'),
                ", ",
                h('a', { attrs: { href: 'https://github.com/gbtami/fairyfishnet' } }, 'fairyfishnet'),
                ", and ",
                h('a', { attrs: { href: 'https://github.com/gbtami/lichess-bot-variants' } }, 'lichess-bot-variants.'),
            ]),
            h('p', [
                _('On client side, the user interface of the game board is based on '),
                h('a', { attrs: { href: 'https://github.com/gbtami/chessgroundx' } }, 'chessgroundx.'),
            ]),
            h('p', [
                _('The source code of the server is available on '),
                h('a', { attrs: { href: 'https://github.com/gbtami/pychess-variants' } }, 'GitHub.'),
            ]),
            h('hr'),
            h('p', [
                _('To play on PyChess, you need to have an open and unmarked account on Lichess. '),
                _('Regarding Privacy and Terms of Service, the rules of lichess.org are also applied here. '),
                h('a', { attrs: { href: 'https://lichess.org/privacy' } }, 'Privacy'),
                ", ",
                h('a', { attrs: { href: 'https://lichess.org/terms-of-service' } }, 'ToS'),
            ]),
            h('hr'),
            h('p', untitled.map(paragraph => h('p', paragraph))),
            h('p', 'Untitled_Entity'),
        ]),
    ];
}
