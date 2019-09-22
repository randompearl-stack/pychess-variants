(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.PychessVariants = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
function anim(mutation, state) {
    return state.animation.enabled ? animate(mutation, state) : render(mutation, state);
}
exports.anim = anim;
function render(mutation, state) {
    const result = mutation(state);
    state.dom.redraw();
    return result;
}
exports.render = render;
function makePiece(key, piece, firstRankIs0) {
    return {
        key: key,
        pos: util.key2pos(key, firstRankIs0),
        piece: piece
    };
}
function closer(piece, pieces) {
    return pieces.sort((p1, p2) => {
        return util.distanceSq(piece.pos, p1.pos) - util.distanceSq(piece.pos, p2.pos);
    })[0];
}
function computePlan(prevPieces, current) {
    const firstRankIs0 = current.dimensions.height === 10;
    const anims = {}, animedOrigs = [], fadings = {}, missings = [], news = [], prePieces = {};
    let curP, preP, i, vector;
    for (i in prevPieces) {
        prePieces[i] = makePiece(i, prevPieces[i], firstRankIs0);
    }
    for (const key of util.allKeys[current.geometry]) {
        curP = current.pieces[key];
        preP = prePieces[key];
        if (curP) {
            if (preP) {
                if (!util.samePiece(curP, preP.piece)) {
                    missings.push(preP);
                    news.push(makePiece(key, curP, firstRankIs0));
                }
            }
            else
                news.push(makePiece(key, curP, firstRankIs0));
        }
        else if (preP)
            missings.push(preP);
    }
    news.forEach(newP => {
        preP = closer(newP, missings.filter(p => util.samePiece(newP.piece, p.piece)));
        if (preP) {
            vector = [preP.pos[0] - newP.pos[0], preP.pos[1] - newP.pos[1]];
            anims[newP.key] = vector.concat(vector);
            animedOrigs.push(preP.key);
        }
    });
    missings.forEach(p => {
        if (!util.containsX(animedOrigs, p.key))
            fadings[p.key] = p.piece;
    });
    return {
        anims: anims,
        fadings: fadings
    };
}
function step(state, now) {
    const cur = state.animation.current;
    if (cur === undefined) {
        if (!state.dom.destroyed)
            state.dom.redrawNow();
        return;
    }
    const rest = 1 - (now - cur.start) * cur.frequency;
    if (rest <= 0) {
        state.animation.current = undefined;
        state.dom.redrawNow();
    }
    else {
        const ease = easing(rest);
        for (let i in cur.plan.anims) {
            const cfg = cur.plan.anims[i];
            cfg[2] = cfg[0] * ease;
            cfg[3] = cfg[1] * ease;
        }
        state.dom.redrawNow(true);
        requestAnimationFrame((now = performance.now()) => step(state, now));
    }
}
function animate(mutation, state) {
    const prevPieces = Object.assign({}, state.pieces);
    const result = mutation(state);
    const plan = computePlan(prevPieces, state);
    if (!isObjectEmpty(plan.anims) || !isObjectEmpty(plan.fadings)) {
        const alreadyRunning = state.animation.current && state.animation.current.start;
        state.animation.current = {
            start: performance.now(),
            frequency: 1 / state.animation.duration,
            plan: plan
        };
        if (!alreadyRunning)
            step(state, performance.now());
    }
    else {
        state.dom.redraw();
    }
    return result;
}
function isObjectEmpty(o) {
    for (let _ in o)
        return false;
    return true;
}
function easing(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

},{"./util":17}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const board = require("./board");
const fen_1 = require("./fen");
const config_1 = require("./config");
const anim_1 = require("./anim");
const drag_1 = require("./drag");
const explosion_1 = require("./explosion");
function start(state, redrawAll) {
    function toggleOrientation() {
        board.toggleOrientation(state);
        redrawAll();
    }
    ;
    return {
        set(config) {
            if (config.orientation && config.orientation !== state.orientation)
                toggleOrientation();
            (config.fen ? anim_1.anim : anim_1.render)(state => config_1.configure(state, config), state);
        },
        state,
        getFen: () => fen_1.write(state.pieces, state.geometry),
        toggleOrientation,
        setPieces(pieces) {
            anim_1.anim(state => board.setPieces(state, pieces), state);
        },
        selectSquare(key, force) {
            if (key)
                anim_1.anim(state => board.selectSquare(state, key, force), state);
            else if (state.selected) {
                board.unselect(state);
                state.dom.redraw();
            }
        },
        move(orig, dest) {
            anim_1.anim(state => board.baseMove(state, orig, dest), state);
        },
        newPiece(piece, key) {
            anim_1.anim(state => board.baseNewPiece(state, piece, key), state);
        },
        playPremove() {
            if (state.premovable.current) {
                if (anim_1.anim(board.playPremove, state))
                    return true;
                state.dom.redraw();
            }
            return false;
        },
        playPredrop(validate) {
            if (state.predroppable.current) {
                const result = board.playPredrop(state, validate);
                state.dom.redraw();
                return result;
            }
            return false;
        },
        cancelPremove() {
            anim_1.render(board.unsetPremove, state);
        },
        cancelPredrop() {
            anim_1.render(board.unsetPredrop, state);
        },
        cancelMove() {
            anim_1.render(state => { board.cancelMove(state); drag_1.cancel(state); }, state);
        },
        stop() {
            anim_1.render(state => { board.stop(state); drag_1.cancel(state); }, state);
        },
        explode(keys) {
            explosion_1.default(state, keys);
        },
        setAutoShapes(shapes) {
            anim_1.render(state => state.drawable.autoShapes = shapes, state);
        },
        setShapes(shapes) {
            anim_1.render(state => state.drawable.shapes = shapes, state);
        },
        getKeyAtDomPos(pos) {
            return board.getKeyAtDomPos(pos, board.whitePov(state), state.dom.bounds(), state.geometry);
        },
        redrawAll,
        dragNewPiece(piece, event, force) {
            drag_1.dragNewPiece(state, piece, event, force);
        },
        destroy() {
            board.stop(state);
            state.dom.unbind && state.dom.unbind();
            state.dom.destroyed = true;
        }
    };
}
exports.start = start;

},{"./anim":1,"./board":3,"./config":5,"./drag":6,"./explosion":10,"./fen":11}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const premove_1 = require("./premove");
const cg = require("./types");
function callUserFunction(f, ...args) {
    if (f)
        setTimeout(() => f(...args), 1);
}
exports.callUserFunction = callUserFunction;
function toggleOrientation(state) {
    state.orientation = util_1.opposite(state.orientation);
    state.animation.current =
        state.draggable.current =
            state.selected = undefined;
}
exports.toggleOrientation = toggleOrientation;
function reset(state) {
    state.lastMove = undefined;
    unselect(state);
    unsetPremove(state);
    unsetPredrop(state);
}
exports.reset = reset;
function setPieces(state, pieces) {
    for (let key in pieces) {
        const piece = pieces[key];
        if (piece)
            state.pieces[key] = piece;
        else
            delete state.pieces[key];
    }
}
exports.setPieces = setPieces;
function setCheck(state, color) {
    state.check = undefined;
    if (color === true)
        color = state.turnColor;
    if (color)
        for (let k in state.pieces) {
            if (state.pieces[k].role === 'king' && state.pieces[k].color === color) {
                state.check = k;
            }
        }
}
exports.setCheck = setCheck;
function setPremove(state, orig, dest, meta) {
    unsetPredrop(state);
    state.premovable.current = [orig, dest];
    callUserFunction(state.premovable.events.set, orig, dest, meta);
}
function unsetPremove(state) {
    if (state.premovable.current) {
        state.premovable.current = undefined;
        callUserFunction(state.premovable.events.unset);
    }
}
exports.unsetPremove = unsetPremove;
function setPredrop(state, role, key) {
    unsetPremove(state);
    state.predroppable.current = { role, key };
    callUserFunction(state.predroppable.events.set, role, key);
}
function unsetPredrop(state) {
    const pd = state.predroppable;
    if (pd.current) {
        pd.current = undefined;
        callUserFunction(pd.events.unset);
    }
}
exports.unsetPredrop = unsetPredrop;
function tryAutoCastle(state, orig, dest) {
    if (!state.autoCastle)
        return false;
    const king = state.pieces[orig];
    if (!king || king.role !== 'king')
        return false;
    const firstRankIs0 = state.dimensions.height === 10;
    const origPos = util_1.key2pos(orig, firstRankIs0);
    if (origPos[0] !== 5)
        return false;
    if (origPos[1] !== 1 && origPos[1] !== 8)
        return false;
    const destPos = util_1.key2pos(dest, firstRankIs0);
    let oldRookPos, newRookPos, newKingPos;
    if (destPos[0] === 7 || destPos[0] === 8) {
        oldRookPos = util_1.pos2key([8, origPos[1]], state.geometry);
        newRookPos = util_1.pos2key([6, origPos[1]], state.geometry);
        newKingPos = util_1.pos2key([7, origPos[1]], state.geometry);
    }
    else if (destPos[0] === 3 || destPos[0] === 1) {
        oldRookPos = util_1.pos2key([1, origPos[1]], state.geometry);
        newRookPos = util_1.pos2key([4, origPos[1]], state.geometry);
        newKingPos = util_1.pos2key([3, origPos[1]], state.geometry);
    }
    else
        return false;
    const rook = state.pieces[oldRookPos];
    if (!rook || rook.role !== 'rook')
        return false;
    delete state.pieces[orig];
    delete state.pieces[oldRookPos];
    state.pieces[newKingPos] = king;
    state.pieces[newRookPos] = rook;
    return true;
}
function baseMove(state, orig, dest) {
    const origPiece = state.pieces[orig], destPiece = state.pieces[dest];
    if (orig === dest || !origPiece)
        return false;
    const captured = (destPiece && destPiece.color !== origPiece.color) ? destPiece : undefined;
    if (dest == state.selected)
        unselect(state);
    callUserFunction(state.events.move, orig, dest, captured);
    if (!tryAutoCastle(state, orig, dest)) {
        state.pieces[dest] = origPiece;
        delete state.pieces[orig];
    }
    state.lastMove = [orig, dest];
    state.check = undefined;
    callUserFunction(state.events.change);
    return captured || true;
}
exports.baseMove = baseMove;
function baseNewPiece(state, piece, key, force) {
    if (state.pieces[key]) {
        if (force)
            delete state.pieces[key];
        else
            return false;
    }
    callUserFunction(state.events.dropNewPiece, piece, key);
    state.pieces[key] = piece;
    state.lastMove = [key];
    state.check = undefined;
    callUserFunction(state.events.change);
    state.movable.dests = undefined;
    state.turnColor = util_1.opposite(state.turnColor);
    return true;
}
exports.baseNewPiece = baseNewPiece;
function baseUserMove(state, orig, dest) {
    const result = baseMove(state, orig, dest);
    if (result) {
        state.movable.dests = undefined;
        state.turnColor = util_1.opposite(state.turnColor);
        state.animation.current = undefined;
    }
    return result;
}
function userMove(state, orig, dest) {
    if (canMove(state, orig, dest)) {
        const result = baseUserMove(state, orig, dest);
        if (result) {
            const holdTime = state.hold.stop();
            unselect(state);
            const metadata = {
                premove: false,
                ctrlKey: state.stats.ctrlKey,
                holdTime
            };
            if (result !== true)
                metadata.captured = result;
            callUserFunction(state.movable.events.after, orig, dest, metadata);
            return true;
        }
    }
    else if (canPremove(state, orig, dest)) {
        setPremove(state, orig, dest, {
            ctrlKey: state.stats.ctrlKey
        });
        unselect(state);
        return true;
    }
    unselect(state);
    return false;
}
exports.userMove = userMove;
function dropNewPiece(state, orig, dest, force) {
    if (canDrop(state, orig, dest) || force) {
        const piece = state.pieces[orig];
        delete state.pieces[orig];
        baseNewPiece(state, piece, dest, force);
        callUserFunction(state.movable.events.afterNewPiece, piece.role, dest, {
            predrop: false
        });
    }
    else if (canPredrop(state, orig, dest)) {
        setPredrop(state, state.pieces[orig].role, dest);
    }
    else {
        unsetPremove(state);
        unsetPredrop(state);
    }
    delete state.pieces[orig];
    unselect(state);
}
exports.dropNewPiece = dropNewPiece;
function selectSquare(state, key, force) {
    callUserFunction(state.events.select, key);
    if (state.selected) {
        if (state.selected === key && !state.draggable.enabled) {
            unselect(state);
            state.hold.cancel();
            return;
        }
        else if ((state.selectable.enabled || force) && state.selected !== key) {
            if (userMove(state, state.selected, key)) {
                state.stats.dragged = false;
                return;
            }
        }
    }
    if (isMovable(state, key) || isPremovable(state, key)) {
        setSelected(state, key);
        state.hold.start();
    }
}
exports.selectSquare = selectSquare;
function setSelected(state, key) {
    state.selected = key;
    if (isPremovable(state, key)) {
        state.premovable.dests = premove_1.default(state.pieces, key, state.premovable.castle, state.geometry);
    }
    else
        state.premovable.dests = undefined;
}
exports.setSelected = setSelected;
function unselect(state) {
    state.selected = undefined;
    state.premovable.dests = undefined;
    state.hold.cancel();
}
exports.unselect = unselect;
function isMovable(state, orig) {
    const piece = state.pieces[orig];
    return !!piece && (state.movable.color === 'both' || (state.movable.color === piece.color &&
        state.turnColor === piece.color));
}
function canMove(state, orig, dest) {
    return orig !== dest && isMovable(state, orig) && (state.movable.free || (!!state.movable.dests && util_1.containsX(state.movable.dests[orig], dest)));
}
exports.canMove = canMove;
function canDrop(state, orig, dest) {
    const piece = state.pieces[orig];
    return !!piece && dest && (orig === dest || !state.pieces[dest]) && (state.movable.color === 'both' || (state.movable.color === piece.color &&
        state.turnColor === piece.color));
}
function isPremovable(state, orig) {
    const piece = state.pieces[orig];
    return !!piece && state.premovable.enabled &&
        state.movable.color === piece.color &&
        state.turnColor !== piece.color;
}
function canPremove(state, orig, dest) {
    return orig !== dest &&
        isPremovable(state, orig) &&
        util_1.containsX(premove_1.default(state.pieces, orig, state.premovable.castle, state.geometry), dest);
}
function canPredrop(state, orig, dest) {
    const piece = state.pieces[orig];
    const destPiece = state.pieces[dest];
    return !!piece && dest &&
        (!destPiece || destPiece.color !== state.movable.color) &&
        state.predroppable.enabled &&
        (piece.role !== 'pawn' || (dest[1] !== '1' && dest[1] !== '8')) &&
        state.movable.color === piece.color &&
        state.turnColor !== piece.color;
}
function isDraggable(state, orig) {
    const piece = state.pieces[orig];
    return !!piece && state.draggable.enabled && (state.movable.color === 'both' || (state.movable.color === piece.color && (state.turnColor === piece.color || state.premovable.enabled)));
}
exports.isDraggable = isDraggable;
function playPremove(state) {
    const move = state.premovable.current;
    if (!move)
        return false;
    const orig = move[0], dest = move[1];
    let success = false;
    if (canMove(state, orig, dest)) {
        const result = baseUserMove(state, orig, dest);
        if (result) {
            const metadata = { premove: true };
            if (result !== true)
                metadata.captured = result;
            callUserFunction(state.movable.events.after, orig, dest, metadata);
            success = true;
        }
    }
    unsetPremove(state);
    return success;
}
exports.playPremove = playPremove;
function playPredrop(state, validate) {
    let drop = state.predroppable.current, success = false;
    if (!drop)
        return false;
    if (validate(drop)) {
        const piece = {
            role: drop.role,
            color: state.movable.color
        };
        if (baseNewPiece(state, piece, drop.key)) {
            callUserFunction(state.movable.events.afterNewPiece, drop.role, drop.key, {
                predrop: true
            });
            success = true;
        }
    }
    unsetPredrop(state);
    return success;
}
exports.playPredrop = playPredrop;
function cancelMove(state) {
    unsetPremove(state);
    unsetPredrop(state);
    unselect(state);
}
exports.cancelMove = cancelMove;
function stop(state) {
    state.movable.color =
        state.movable.dests =
            state.animation.current = undefined;
    cancelMove(state);
}
exports.stop = stop;
function getKeyAtDomPos(pos, asWhite, bounds, geom) {
    const bd = cg.dimensions[geom];
    let file = Math.ceil(bd.width * ((pos[0] - bounds.left) / bounds.width));
    if (!asWhite)
        file = bd.width + 1 - file;
    let rank = Math.ceil(bd.height - (bd.height * ((pos[1] - bounds.top) / bounds.height)));
    if (!asWhite)
        rank = bd.height + 1 - rank;
    return (file > 0 && file < bd.width + 1 && rank > 0 && rank < bd.height + 1) ? util_1.pos2key([file, rank], geom) : undefined;
}
exports.getKeyAtDomPos = getKeyAtDomPos;
function whitePov(s) {
    return s.orientation === 'white';
}
exports.whitePov = whitePov;

},{"./premove":12,"./types":16,"./util":17}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("./api");
const config_1 = require("./config");
const state_1 = require("./state");
const wrap_1 = require("./wrap");
const events = require("./events");
const render_1 = require("./render");
const svg = require("./svg");
const util = require("./util");
function Chessground(element, config) {
    const state = state_1.defaults();
    config_1.configure(state, config || {});
    function redrawAll() {
        let prevUnbind = state.dom && state.dom.unbind;
        const relative = state.viewOnly && !state.drawable.visible, elements = wrap_1.default(element, state, relative), bounds = util.memo(() => elements.board.getBoundingClientRect()), redrawNow = (skipSvg) => {
            render_1.default(state);
            if (!skipSvg && elements.svg)
                svg.renderSvg(state, elements.svg);
        };
        state.dom = {
            elements,
            bounds,
            redraw: debounceRedraw(redrawNow),
            redrawNow,
            unbind: prevUnbind,
            relative
        };
        state.drawable.prevSvgHash = '';
        redrawNow(false);
        events.bindBoard(state);
        if (!prevUnbind)
            state.dom.unbind = events.bindDocument(state, redrawAll);
        state.events.insert && state.events.insert(elements);
    }
    redrawAll();
    return api_1.start(state, redrawAll);
}
exports.Chessground = Chessground;
;
function debounceRedraw(redrawNow) {
    let redrawing = false;
    return () => {
        if (redrawing)
            return;
        redrawing = true;
        requestAnimationFrame(() => {
            redrawNow();
            redrawing = false;
        });
    };
}

},{"./api":2,"./config":5,"./events":9,"./render":13,"./state":14,"./svg":15,"./util":17,"./wrap":18}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const board_1 = require("./board");
const fen_1 = require("./fen");
const cg = require("./types");
function configure(state, config) {
    if (config.movable && config.movable.dests)
        state.movable.dests = undefined;
    merge(state, config);
    if (config.geometry)
        state.dimensions = cg.dimensions[config.geometry];
    if (config.fen) {
        state.pieces = fen_1.read(config.fen, state.geometry);
        state.drawable.shapes = [];
    }
    if (config.hasOwnProperty('check'))
        board_1.setCheck(state, config.check || false);
    if (config.hasOwnProperty('lastMove') && !config.lastMove)
        state.lastMove = undefined;
    else if (config.lastMove)
        state.lastMove = config.lastMove;
    if (state.selected)
        board_1.setSelected(state, state.selected);
    if (!state.animation.duration || state.animation.duration < 100)
        state.animation.enabled = false;
    if (!state.movable.rookCastle && state.movable.dests) {
        const rank = state.movable.color === 'white' ? 1 : 8, kingStartPos = 'e' + rank, dests = state.movable.dests[kingStartPos], king = state.pieces[kingStartPos];
        if (!dests || !king || king.role !== 'king')
            return;
        state.movable.dests[kingStartPos] = dests.filter(d => !((d === 'a' + rank) && dests.indexOf('c' + rank) !== -1) &&
            !((d === 'h' + rank) && dests.indexOf('g' + rank) !== -1));
    }
}
exports.configure = configure;
;
function merge(base, extend) {
    for (let key in extend) {
        if (isObject(base[key]) && isObject(extend[key]))
            merge(base[key], extend[key]);
        else
            base[key] = extend[key];
    }
}
function isObject(o) {
    return typeof o === 'object';
}

},{"./board":3,"./fen":11,"./types":16}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const board = require("./board");
const util = require("./util");
const draw_1 = require("./draw");
const anim_1 = require("./anim");
function start(s, e) {
    if (e.button !== undefined && e.button !== 0)
        return;
    if (e.touches && e.touches.length > 1)
        return;
    const bounds = s.dom.bounds(), position = util.eventPosition(e), orig = board.getKeyAtDomPos(position, board.whitePov(s), bounds, s.geometry);
    if (!orig)
        return;
    const piece = s.pieces[orig];
    const previouslySelected = s.selected;
    if (!previouslySelected && s.drawable.enabled && (s.drawable.eraseOnClick || (!piece || piece.color !== s.turnColor)))
        draw_1.clear(s);
    if (e.cancelable !== false &&
        (!e.touches || !s.movable.color || piece || previouslySelected || pieceCloseTo(s, position)))
        e.preventDefault();
    const hadPremove = !!s.premovable.current;
    const hadPredrop = !!s.predroppable.current;
    s.stats.ctrlKey = e.ctrlKey;
    if (s.selected && board.canMove(s, s.selected, orig)) {
        anim_1.anim(state => board.selectSquare(state, orig), s);
    }
    else {
        board.selectSquare(s, orig);
    }
    const stillSelected = s.selected === orig;
    const element = pieceElementByKey(s, orig);
    const firstRankIs0 = s.dimensions.height === 10;
    if (piece && element && stillSelected && board.isDraggable(s, orig)) {
        const squareBounds = computeSquareBounds(orig, board.whitePov(s), bounds, s.dimensions);
        s.draggable.current = {
            orig,
            origPos: util.key2pos(orig, firstRankIs0),
            piece,
            rel: position,
            epos: position,
            pos: [0, 0],
            dec: s.draggable.centerPiece ? [
                position[0] - (squareBounds.left + squareBounds.width / 2),
                position[1] - (squareBounds.top + squareBounds.height / 2)
            ] : [0, 0],
            started: s.draggable.autoDistance && s.stats.dragged,
            element,
            previouslySelected,
            originTarget: e.target
        };
        element.cgDragging = true;
        element.classList.add('dragging');
        const ghost = s.dom.elements.ghost;
        if (ghost) {
            ghost.className = `ghost ${piece.color} ${piece.role}`;
            util.translateAbs(ghost, util.posToTranslateAbs(bounds, s.dimensions)(util.key2pos(orig, firstRankIs0), board.whitePov(s)));
            util.setVisible(ghost, true);
        }
        processDrag(s);
    }
    else {
        if (hadPremove)
            board.unsetPremove(s);
        if (hadPredrop)
            board.unsetPredrop(s);
    }
    s.dom.redraw();
}
exports.start = start;
function pieceCloseTo(s, pos) {
    const asWhite = board.whitePov(s), bounds = s.dom.bounds(), radiusSq = Math.pow(bounds.width / 8, 2);
    for (let key in s.pieces) {
        const squareBounds = computeSquareBounds(key, asWhite, bounds, s.dimensions), center = [
            squareBounds.left + squareBounds.width / 2,
            squareBounds.top + squareBounds.height / 2
        ];
        if (util.distanceSq(center, pos) <= radiusSq)
            return true;
    }
    return false;
}
exports.pieceCloseTo = pieceCloseTo;
function dragNewPiece(s, piece, e, force) {
    const key = 'z0';
    s.pieces[key] = piece;
    s.dom.redraw();
    const position = util.eventPosition(e), asWhite = board.whitePov(s), bounds = s.dom.bounds(), squareBounds = computeSquareBounds(key, asWhite, bounds, s.dimensions);
    const rel = [
        (asWhite ? 0 : s.dimensions.width - 1) * squareBounds.width + bounds.left,
        (asWhite ? s.dimensions.height : -1) * squareBounds.height + bounds.top
    ];
    const firstRankIs0 = s.geometry === 3;
    s.draggable.current = {
        orig: key,
        origPos: util.key2pos('a0', firstRankIs0),
        piece,
        rel,
        epos: position,
        pos: [position[0] - rel[0], position[1] - rel[1]],
        dec: [-squareBounds.width / 2, -squareBounds.height / 2],
        started: true,
        element: () => pieceElementByKey(s, key),
        originTarget: e.target,
        newPiece: true,
        force: !!force
    };
    processDrag(s);
}
exports.dragNewPiece = dragNewPiece;
function processDrag(s) {
    requestAnimationFrame(() => {
        const cur = s.draggable.current;
        if (!cur)
            return;
        if (s.animation.current && s.animation.current.plan.anims[cur.orig])
            s.animation.current = undefined;
        const origPiece = s.pieces[cur.orig];
        if (!origPiece || !util.samePiece(origPiece, cur.piece))
            cancel(s);
        else {
            if (!cur.started && util.distanceSq(cur.epos, cur.rel) >= Math.pow(s.draggable.distance, 2))
                cur.started = true;
            if (cur.started) {
                if (typeof cur.element === 'function') {
                    const found = cur.element();
                    if (!found)
                        return;
                    found.cgDragging = true;
                    found.classList.add('dragging');
                    cur.element = found;
                }
                cur.pos = [
                    cur.epos[0] - cur.rel[0],
                    cur.epos[1] - cur.rel[1]
                ];
                const translation = util.posToTranslateAbs(s.dom.bounds(), s.dimensions)(cur.origPos, board.whitePov(s));
                translation[0] += cur.pos[0] + cur.dec[0];
                translation[1] += cur.pos[1] + cur.dec[1];
                util.translateAbs(cur.element, translation);
            }
        }
        processDrag(s);
    });
}
function move(s, e) {
    if (s.draggable.current && (!e.touches || e.touches.length < 2)) {
        s.draggable.current.epos = util.eventPosition(e);
    }
}
exports.move = move;
function end(s, e) {
    const cur = s.draggable.current;
    if (!cur)
        return;
    if (e.type === 'touchend' && e.cancelable !== false)
        e.preventDefault();
    if (e.type === 'touchend' && cur && cur.originTarget !== e.target && !cur.newPiece) {
        s.draggable.current = undefined;
        return;
    }
    board.unsetPremove(s);
    board.unsetPredrop(s);
    const eventPos = util.eventPosition(e) || cur.epos;
    const dest = board.getKeyAtDomPos(eventPos, board.whitePov(s), s.dom.bounds(), s.geometry);
    if (dest && cur.started && cur.orig !== dest) {
        if (cur.newPiece)
            board.dropNewPiece(s, cur.orig, dest, cur.force);
        else {
            s.stats.ctrlKey = e.ctrlKey;
            if (board.userMove(s, cur.orig, dest))
                s.stats.dragged = true;
        }
    }
    else if (cur.newPiece) {
        delete s.pieces[cur.orig];
    }
    else if (s.draggable.deleteOnDropOff && !dest) {
        delete s.pieces[cur.orig];
        board.callUserFunction(s.events.change);
    }
    if (cur && cur.orig === cur.previouslySelected && (cur.orig === dest || !dest))
        board.unselect(s);
    else if (!s.selectable.enabled)
        board.unselect(s);
    removeDragElements(s);
    s.draggable.current = undefined;
    s.dom.redraw();
}
exports.end = end;
function cancel(s) {
    const cur = s.draggable.current;
    if (cur) {
        if (cur.newPiece)
            delete s.pieces[cur.orig];
        s.draggable.current = undefined;
        board.unselect(s);
        removeDragElements(s);
        s.dom.redraw();
    }
}
exports.cancel = cancel;
function removeDragElements(s) {
    const e = s.dom.elements;
    if (e.ghost)
        util.setVisible(e.ghost, false);
}
function computeSquareBounds(key, asWhite, bounds, bd) {
    const firstRankIs0 = bd.height === 10;
    const pos = util.key2pos(key, firstRankIs0);
    if (!asWhite) {
        pos[0] = bd.width + 1 - pos[0];
        pos[1] = bd.height + 1 - pos[1];
    }
    return {
        left: bounds.left + bounds.width * (pos[0] - 1) / bd.width,
        top: bounds.top + bounds.height * (bd.height - pos[1]) / bd.height,
        width: bounds.width / bd.width,
        height: bounds.height / bd.height
    };
}
function pieceElementByKey(s, key) {
    let el = s.dom.elements.board.firstChild;
    while (el) {
        if (el.cgKey === key && el.tagName === 'PIECE')
            return el;
        el = el.nextSibling;
    }
    return undefined;
}

},{"./anim":1,"./board":3,"./draw":7,"./util":17}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const board_1 = require("./board");
const util_1 = require("./util");
const brushes = ['green', 'red', 'blue', 'yellow'];
function start(state, e) {
    if (e.touches && e.touches.length > 1)
        return;
    e.stopPropagation();
    e.preventDefault();
    e.ctrlKey ? board_1.unselect(state) : board_1.cancelMove(state);
    const pos = util_1.eventPosition(e), orig = board_1.getKeyAtDomPos(pos, board_1.whitePov(state), state.dom.bounds(), state.geometry);
    if (!orig)
        return;
    state.drawable.current = {
        orig,
        pos,
        brush: eventBrush(e)
    };
    processDraw(state);
}
exports.start = start;
function processDraw(state) {
    requestAnimationFrame(() => {
        const cur = state.drawable.current;
        if (cur) {
            const mouseSq = board_1.getKeyAtDomPos(cur.pos, board_1.whitePov(state), state.dom.bounds(), state.geometry);
            if (mouseSq !== cur.mouseSq) {
                cur.mouseSq = mouseSq;
                cur.dest = mouseSq !== cur.orig ? mouseSq : undefined;
                state.dom.redrawNow();
            }
            processDraw(state);
        }
    });
}
exports.processDraw = processDraw;
function move(state, e) {
    if (state.drawable.current)
        state.drawable.current.pos = util_1.eventPosition(e);
}
exports.move = move;
function end(state) {
    const cur = state.drawable.current;
    if (cur) {
        if (cur.mouseSq)
            addShape(state.drawable, cur);
        cancel(state);
    }
}
exports.end = end;
function cancel(state) {
    if (state.drawable.current) {
        state.drawable.current = undefined;
        state.dom.redraw();
    }
}
exports.cancel = cancel;
function clear(state) {
    if (state.drawable.shapes.length) {
        state.drawable.shapes = [];
        state.dom.redraw();
        onChange(state.drawable);
    }
}
exports.clear = clear;
function eventBrush(e) {
    return brushes[(e.shiftKey && util_1.isRightButton(e) ? 1 : 0) + (e.altKey ? 2 : 0)];
}
function addShape(drawable, cur) {
    const sameShape = (s) => s.orig === cur.orig && s.dest === cur.dest;
    const similar = drawable.shapes.filter(sameShape)[0];
    if (similar)
        drawable.shapes = drawable.shapes.filter(s => !sameShape(s));
    if (!similar || similar.brush !== cur.brush)
        drawable.shapes.push(cur);
    onChange(drawable);
}
function onChange(drawable) {
    if (drawable.onChange)
        drawable.onChange(drawable.shapes);
}

},{"./board":3,"./util":17}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const board = require("./board");
const util = require("./util");
const drag_1 = require("./drag");
function setDropMode(s, piece) {
    s.dropmode = {
        active: true,
        piece
    };
    drag_1.cancel(s);
}
exports.setDropMode = setDropMode;
function cancelDropMode(s) {
    s.dropmode = {
        active: false
    };
}
exports.cancelDropMode = cancelDropMode;
function drop(s, e) {
    if (!s.dropmode.active)
        return;
    board.unsetPremove(s);
    board.unsetPredrop(s);
    const piece = s.dropmode.piece;
    if (piece) {
        s.pieces.z0 = piece;
        const position = util.eventPosition(e);
        const dest = position && board.getKeyAtDomPos(position, board.whitePov(s), s.dom.bounds(), s.geometry);
        if (dest)
            board.dropNewPiece(s, 'z0', dest);
    }
    s.dom.redraw();
}
exports.drop = drop;

},{"./board":3,"./drag":6,"./util":17}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const drag = require("./drag");
const draw = require("./draw");
const drop_1 = require("./drop");
const util_1 = require("./util");
function bindBoard(s) {
    if (s.viewOnly)
        return;
    const boardEl = s.dom.elements.board, onStart = startDragOrDraw(s);
    boardEl.addEventListener('touchstart', onStart, { passive: false });
    boardEl.addEventListener('mousedown', onStart, { passive: false });
    if (s.disableContextMenu || s.drawable.enabled) {
        boardEl.addEventListener('contextmenu', e => e.preventDefault());
    }
}
exports.bindBoard = bindBoard;
function bindDocument(s, redrawAll) {
    const unbinds = [];
    if (!s.dom.relative && s.resizable) {
        const onResize = () => {
            s.dom.bounds.clear();
            requestAnimationFrame(redrawAll);
        };
        unbinds.push(unbindable(document.body, 'chessground.resize', onResize));
    }
    if (!s.viewOnly) {
        const onmove = dragOrDraw(s, drag.move, draw.move);
        const onend = dragOrDraw(s, drag.end, draw.end);
        ['touchmove', 'mousemove'].forEach(ev => unbinds.push(unbindable(document, ev, onmove)));
        ['touchend', 'mouseup'].forEach(ev => unbinds.push(unbindable(document, ev, onend)));
        const onScroll = () => s.dom.bounds.clear();
        unbinds.push(unbindable(window, 'scroll', onScroll, { passive: true }));
        unbinds.push(unbindable(window, 'resize', onScroll, { passive: true }));
    }
    return () => unbinds.forEach(f => f());
}
exports.bindDocument = bindDocument;
function unbindable(el, eventName, callback, options) {
    el.addEventListener(eventName, callback, options);
    return () => el.removeEventListener(eventName, callback);
}
function startDragOrDraw(s) {
    return e => {
        if (s.draggable.current)
            drag.cancel(s);
        else if (s.drawable.current)
            draw.cancel(s);
        else if (e.shiftKey || util_1.isRightButton(e)) {
            if (s.drawable.enabled)
                draw.start(s, e);
        }
        else if (!s.viewOnly) {
            if (s.dropmode.active)
                drop_1.drop(s, e);
            else
                drag.start(s, e);
        }
    };
}
function dragOrDraw(s, withDrag, withDraw) {
    return e => {
        if (e.shiftKey || util_1.isRightButton(e)) {
            if (s.drawable.enabled)
                withDraw(s, e);
        }
        else if (!s.viewOnly)
            withDrag(s, e);
    };
}

},{"./drag":6,"./draw":7,"./drop":8,"./util":17}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function explosion(state, keys) {
    state.exploding = { stage: 1, keys };
    state.dom.redraw();
    setTimeout(() => {
        setStage(state, 2);
        setTimeout(() => setStage(state, undefined), 120);
    }, 120);
}
exports.default = explosion;
function setStage(state, stage) {
    if (state.exploding) {
        if (stage)
            state.exploding.stage = stage;
        else
            state.exploding = undefined;
        state.dom.redraw();
    }
}

},{}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const cg = require("./types");
exports.initial = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
const roles8 = {
    p: 'pawn', r: 'rook', n: 'knight', b: 'bishop', q: 'queen', k: 'king', m: 'met', f: 'ferz', s: 'silver', c: 'cancellor', a: 'archbishop', h: 'hawk', e: 'elephant'
};
const roles9 = {
    p: 'pawn', r: 'rook', n: 'knight', b: 'bishop', k: 'king', g: 'gold', s: 'silver', l: 'lance'
};
const roles10 = {
    p: 'pawn', r: 'rook', n: 'knight', b: 'bishop', k: 'king', c: 'cannon', a: 'advisor'
};
const letters8 = {
    pawn: 'p', rook: 'r', knight: 'n', bishop: 'b', queen: 'q', king: 'k', met: 'm', ferz: 'f', silver: 's', cancellor: 'c', archbishop: 'a', hawk: 'h', elephant: 'e'
};
const letters9 = {
    pawn: 'p', rook: 'r', knight: 'n', bishop: 'b', king: 'k', gold: 'g', silver: 's', lance: 'l',
    ppawn: '+p', pknight: '+n', pbishop: '+b', prook: '+r', psilver: '+s', plance: '+l'
};
const letters10 = {
    pawn: 'p', rook: 'r', knight: 'n', bishop: 'b', king: 'k', cannon: 'c', advisor: 'a'
};
function read(fen, geom) {
    if (fen === 'start')
        fen = exports.initial;
    if (fen.indexOf('[') !== -1)
        fen = fen.slice(0, fen.indexOf('['));
    const pieces = {};
    let row = fen.split("/").length;
    let col = 0;
    let promoted = false;
    const roles = (geom === 3) ? roles10 : (geom === 1) ? roles9 : roles8;
    const firstRankIs0 = row === 10;
    const shogi = row === 9;
    for (const c of fen) {
        switch (c) {
            case ' ': return pieces;
            case '/':
                --row;
                if (row === 0)
                    return pieces;
                col = 0;
                break;
            case '+':
                promoted = true;
                break;
            case '~':
                const piece = pieces[cg.files[col] + cg.ranks[firstRankIs0 ? row : row + 1]];
                if (piece)
                    piece.promoted = true;
                break;
            default:
                const nb = c.charCodeAt(0);
                if (nb < 58)
                    col += (c === '0') ? 9 : nb - 48;
                else {
                    ++col;
                    const role = c.toLowerCase();
                    let piece = {
                        role: roles[role],
                        color: (c === role ? shogi ? 'white' : 'black' : shogi ? 'black' : 'white')
                    };
                    if (promoted) {
                        piece.role = 'p' + piece.role;
                        piece.promoted = true;
                        promoted = false;
                    }
                    ;
                    if (shogi) {
                        pieces[cg.files[10 - col - 1] + cg.ranks[10 - row]] = piece;
                    }
                    else {
                        pieces[cg.files[col - 1] + cg.ranks[firstRankIs0 ? row - 1 : row]] = piece;
                    }
                    ;
                }
        }
    }
    return pieces;
}
exports.read = read;
function write(pieces, geom) {
    var letters = {};
    switch (geom) {
        case 3:
            letters = letters10;
            break;
        case 1:
            letters = letters9;
            break;
        default:
            letters = letters8;
            break;
    }
    ;
    return util_1.invNRanks.map(y => util_1.NRanks.map(x => {
        const piece = pieces[util_1.pos2key([x, y], geom)];
        if (piece) {
            const letter = letters[piece.role];
            return piece.color === 'white' ? letter.toUpperCase() : letter;
        }
        else
            return '1';
    }).join('')).join('/').replace(/1{2,}/g, s => s.length.toString());
}
exports.write = write;

},{"./types":16,"./util":17}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
const cg = require("./types");
function diff(a, b) {
    return Math.abs(a - b);
}
function pawn(color) {
    return (x1, y1, x2, y2) => diff(x1, x2) < 2 && (color === 'white' ? (y2 === y1 + 1 || (y1 <= 2 && y2 === (y1 + 2) && x1 === x2)) : (y2 === y1 - 1 || (y1 >= 7 && y2 === (y1 - 2) && x1 === x2)));
}
const knight = (x1, y1, x2, y2) => {
    const xd = diff(x1, x2);
    const yd = diff(y1, y2);
    return (xd === 1 && yd === 2) || (xd === 2 && yd === 1);
};
const bishop = (x1, y1, x2, y2) => {
    return diff(x1, x2) === diff(y1, y2);
};
const rook = (x1, y1, x2, y2) => {
    return x1 === x2 || y1 === y2;
};
const queen = (x1, y1, x2, y2) => {
    return bishop(x1, y1, x2, y2) || rook(x1, y1, x2, y2);
};
function king(color, rookFiles, canCastle) {
    return (x1, y1, x2, y2) => (diff(x1, x2) < 2 && diff(y1, y2) < 2) || (canCastle && y1 === y2 && y1 === (color === 'white' ? 1 : 8) && ((x1 === 5 && (x2 === 3 || x2 === 7)) || util.containsX(rookFiles, x2)));
}
const met = (x1, y1, x2, y2) => {
    return diff(x1, x2) === diff(y1, y2) && diff(x1, x2) === 1;
};
const archbishop = (x1, y1, x2, y2) => {
    return bishop(x1, y1, x2, y2) || knight(x1, y1, x2, y2);
};
const cancellor = (x1, y1, x2, y2) => {
    return rook(x1, y1, x2, y2) || knight(x1, y1, x2, y2);
};
function lance(color) {
    return (x1, y1, x2, y2) => (x2 === x1 && (color === 'white' ? y2 > y1 : y2 < y1));
}
function silver(color) {
    return (x1, y1, x2, y2) => (met(x1, y1, x2, y2) || (x1 === x2 && (color === 'white' ? y2 === y1 + 1 : y2 === y1 - 1)));
}
function gold(color) {
    return (x1, y1, x2, y2) => (diff(x1, x2) < 2 && diff(y1, y2) < 2 && (color === 'white' ?
        !((x2 === x1 - 1 && y2 === y1 - 1) || (x2 === x1 + 1 && y2 === y1 - 1)) :
        !((x2 === x1 + 1 && y2 === y1 + 1) || (x2 === x1 - 1 && y2 === y1 + 1))));
}
function spawn(color) {
    return (x1, y1, x2, y2) => (x2 === x1 && (color === 'white' ? y2 === y1 + 1 : y2 === y1 - 1));
}
function sknight(color) {
    return (x1, y1, x2, y2) => color === 'white' ?
        (y2 === y1 + 2 && x2 === x1 - 1 || y2 === y1 + 2 && x2 === x1 + 1) :
        (y2 === y1 - 2 && x2 === x1 - 1 || y2 === y1 - 2 && x2 === x1 + 1);
}
const prook = (x1, y1, x2, y2) => {
    return rook(x1, y1, x2, y2) || (diff(x1, x2) < 2 && diff(y1, y2) < 2);
};
const pbishop = (x1, y1, x2, y2) => {
    return bishop(x1, y1, x2, y2) || (diff(x1, x2) < 2 && diff(y1, y2) < 2);
};
const sking = (x1, y1, x2, y2) => {
    return diff(x1, x2) < 2 && diff(y1, y2) < 2;
};
function xpawn(color) {
    return (x1, y1, x2, y2) => ((x2 === x1 && (color === 'white' ? y2 === y1 + 1 : y2 === y1 - 1)) ||
        (y2 === y1 && (x2 === x1 + 1 || x2 === x1 - 1) && (color === 'white' ? y1 > 5 : y1 < 6)));
}
const xbishop = (x1, y1, x2, y2) => {
    return diff(x1, x2) === diff(y1, y2) && diff(x1, x2) === 2;
};
const advisor = (x1, y1, x2, y2) => {
    return diff(x1, x2) === diff(y1, y2) && diff(x1, x2) === 1;
};
const xking = (x1, y1, x2, y2) => {
    return (x1 === x2 || y1 === y2) && diff(x1, x2) === 1;
};
function rookFilesOf(pieces, color, firstRankIs0) {
    return Object.keys(pieces).filter(key => {
        const piece = pieces[key];
        return piece && piece.color === color && piece.role === 'rook';
    }).map((key) => util.key2pos(key, firstRankIs0)[0]);
}
function premove(pieces, key, canCastle, geom) {
    const firstRankIs0 = cg.dimensions[geom].height === 10;
    const piece = pieces[key], pos = util.key2pos(key, firstRankIs0);
    let mobility;
    switch (geom) {
        case 3:
            switch (piece.role) {
                case 'pawn':
                    mobility = xpawn(piece.color);
                    break;
                case 'cannon':
                case 'rook':
                    mobility = rook;
                    break;
                case 'knight':
                    mobility = knight;
                    break;
                case 'bishop':
                    mobility = xbishop;
                    break;
                case 'advisor':
                    mobility = advisor;
                    break;
                case 'king':
                    mobility = xking;
                    break;
            }
            ;
            break;
        case 1:
            switch (piece.role) {
                case 'pawn':
                    mobility = spawn(piece.color);
                    break;
                case 'knight':
                    mobility = sknight(piece.color);
                    break;
                case 'bishop':
                    mobility = bishop;
                    break;
                case 'rook':
                    mobility = rook;
                    break;
                case 'king':
                    mobility = sking;
                    break;
                case 'silver':
                    mobility = silver(piece.color);
                    break;
                case 'ppawn':
                case 'plance':
                case 'pknight':
                case 'psilver':
                case 'gold':
                    mobility = gold(piece.color);
                    break;
                case 'lance':
                    mobility = lance(piece.color);
                    break;
                case 'prook':
                    mobility = prook;
                    break;
                case 'pbishop':
                    mobility = pbishop;
                    break;
            }
            ;
            break;
        default:
            switch (piece.role) {
                case 'pawn':
                    mobility = pawn(piece.color);
                    break;
                case 'knight':
                    mobility = knight;
                    break;
                case 'bishop':
                    mobility = bishop;
                    break;
                case 'rook':
                    mobility = rook;
                    break;
                case 'queen':
                    mobility = queen;
                    break;
                case 'king':
                    mobility = king(piece.color, rookFilesOf(pieces, piece.color, firstRankIs0), canCastle);
                    break;
                case 'hawk':
                case 'archbishop':
                    mobility = archbishop;
                    break;
                case 'elephant':
                case 'cancellor':
                    mobility = cancellor;
                    break;
                case 'met':
                case 'ferz':
                    mobility = met;
                    break;
                case 'silver':
                    mobility = silver(piece.color);
                    break;
            }
            ;
            break;
    }
    ;
    const allkeys = util.allKeys[geom];
    const pos2keyGeom = (geom) => ((pos) => util.pos2key(pos, geom));
    const pos2key = pos2keyGeom(geom);
    const key2posRank0 = (firstrank0) => ((key) => util.key2pos(key, firstrank0));
    const key2pos = key2posRank0(firstRankIs0);
    return allkeys.map(key2pos).filter(pos2 => {
        return (pos[0] !== pos2[0] || pos[1] !== pos2[1]) && mobility(pos[0], pos[1], pos2[0], pos2[1]);
    }).map(pos2key);
}
exports.default = premove;
;

},{"./types":16,"./util":17}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const board_1 = require("./board");
const util = require("./util");
function render(s) {
    const firstRankIs0 = s.dimensions.height === 10;
    const asWhite = board_1.whitePov(s), posToTranslate = s.dom.relative ? util.posToTranslateRel : util.posToTranslateAbs(s.dom.bounds(), s.dimensions), translate = s.dom.relative ? util.translateRel : util.translateAbs, boardEl = s.dom.elements.board, pieces = s.pieces, curAnim = s.animation.current, anims = curAnim ? curAnim.plan.anims : {}, fadings = curAnim ? curAnim.plan.fadings : {}, curDrag = s.draggable.current, squares = computeSquareClasses(s), samePieces = {}, sameSquares = {}, movedPieces = {}, movedSquares = {}, piecesKeys = Object.keys(pieces);
    let k, p, el, pieceAtKey, elPieceName, anim, fading, pMvdset, pMvd, sMvdset, sMvd;
    el = boardEl.firstChild;
    while (el) {
        k = el.cgKey;
        if (isPieceNode(el)) {
            pieceAtKey = pieces[k];
            anim = anims[k];
            fading = fadings[k];
            elPieceName = el.cgPiece;
            if (el.cgDragging && (!curDrag || curDrag.orig !== k)) {
                el.classList.remove('dragging');
                translate(el, posToTranslate(util_1.key2pos(k, firstRankIs0), asWhite, s.dimensions));
                el.cgDragging = false;
            }
            if (!fading && el.cgFading) {
                el.cgFading = false;
                el.classList.remove('fading');
            }
            if (pieceAtKey) {
                if (anim && el.cgAnimating && elPieceName === pieceNameOf(pieceAtKey)) {
                    const pos = util_1.key2pos(k, firstRankIs0);
                    pos[0] += anim[2];
                    pos[1] += anim[3];
                    el.classList.add('anim');
                    translate(el, posToTranslate(pos, asWhite, s.dimensions));
                }
                else if (el.cgAnimating) {
                    el.cgAnimating = false;
                    el.classList.remove('anim');
                    translate(el, posToTranslate(util_1.key2pos(k, firstRankIs0), asWhite, s.dimensions));
                    if (s.addPieceZIndex)
                        el.style.zIndex = posZIndex(util_1.key2pos(k, firstRankIs0), asWhite);
                }
                if (elPieceName === pieceNameOf(pieceAtKey) && (!fading || !el.cgFading)) {
                    samePieces[k] = true;
                }
                else {
                    if (fading && elPieceName === pieceNameOf(fading)) {
                        el.classList.add('fading');
                        el.cgFading = true;
                    }
                    else {
                        if (movedPieces[elPieceName])
                            movedPieces[elPieceName].push(el);
                        else
                            movedPieces[elPieceName] = [el];
                    }
                }
            }
            else {
                if (movedPieces[elPieceName])
                    movedPieces[elPieceName].push(el);
                else
                    movedPieces[elPieceName] = [el];
            }
        }
        else if (isSquareNode(el)) {
            const cn = el.className;
            if (squares[k] === cn)
                sameSquares[k] = true;
            else if (movedSquares[cn])
                movedSquares[cn].push(el);
            else
                movedSquares[cn] = [el];
        }
        el = el.nextSibling;
    }
    for (const sk in squares) {
        if (!sameSquares[sk]) {
            sMvdset = movedSquares[squares[sk]];
            sMvd = sMvdset && sMvdset.pop();
            const translation = posToTranslate(util_1.key2pos(sk, firstRankIs0), asWhite, s.dimensions);
            if (sMvd) {
                sMvd.cgKey = sk;
                translate(sMvd, translation);
            }
            else {
                const squareNode = util_1.createEl('square', squares[sk]);
                squareNode.cgKey = sk;
                translate(squareNode, translation);
                boardEl.insertBefore(squareNode, boardEl.firstChild);
            }
        }
    }
    for (const j in piecesKeys) {
        k = piecesKeys[j];
        p = pieces[k];
        anim = anims[k];
        if (!samePieces[k]) {
            pMvdset = movedPieces[pieceNameOf(p)];
            pMvd = pMvdset && pMvdset.pop();
            if (pMvd) {
                pMvd.cgKey = k;
                if (pMvd.cgFading) {
                    pMvd.classList.remove('fading');
                    pMvd.cgFading = false;
                }
                const pos = util_1.key2pos(k, firstRankIs0);
                if (s.addPieceZIndex)
                    pMvd.style.zIndex = posZIndex(pos, asWhite);
                if (anim) {
                    pMvd.cgAnimating = true;
                    pMvd.classList.add('anim');
                    pos[0] += anim[2];
                    pos[1] += anim[3];
                }
                translate(pMvd, posToTranslate(pos, asWhite, s.dimensions));
            }
            else {
                const pieceName = pieceNameOf(p), pieceNode = util_1.createEl('piece', pieceName), pos = util_1.key2pos(k, firstRankIs0);
                pieceNode.cgPiece = pieceName;
                pieceNode.cgKey = k;
                if (anim) {
                    pieceNode.cgAnimating = true;
                    pos[0] += anim[2];
                    pos[1] += anim[3];
                }
                translate(pieceNode, posToTranslate(pos, asWhite, s.dimensions));
                if (s.addPieceZIndex)
                    pieceNode.style.zIndex = posZIndex(pos, asWhite);
                boardEl.appendChild(pieceNode);
            }
        }
    }
    for (const i in movedPieces)
        removeNodes(s, movedPieces[i]);
    for (const i in movedSquares)
        removeNodes(s, movedSquares[i]);
}
exports.default = render;
function isPieceNode(el) {
    return el.tagName === 'PIECE';
}
function isSquareNode(el) {
    return el.tagName === 'SQUARE';
}
function removeNodes(s, nodes) {
    for (const i in nodes)
        s.dom.elements.board.removeChild(nodes[i]);
}
function posZIndex(pos, asWhite) {
    let z = 2 + (pos[1] - 1) * 8 + (8 - pos[0]);
    if (asWhite)
        z = 67 - z;
    return z + '';
}
function pieceNameOf(piece) {
    return `${piece.color} ${piece.role}`;
}
function computeSquareClasses(s) {
    const squares = {};
    let i, k;
    if (s.lastMove && s.highlight.lastMove)
        for (i in s.lastMove) {
            if (s.lastMove[i] != 'z0') {
                addSquare(squares, s.lastMove[i], 'last-move');
            }
        }
    if (s.check && s.highlight.check)
        addSquare(squares, s.check, 'check');
    if (s.selected) {
        if (s.selected != 'z0') {
            addSquare(squares, s.selected, 'selected');
        }
        if (s.movable.showDests) {
            const dests = s.movable.dests && s.movable.dests[s.selected];
            if (dests)
                for (i in dests) {
                    k = dests[i];
                    addSquare(squares, k, 'move-dest' + (s.pieces[k] ? ' oc' : ''));
                }
            const pDests = s.premovable.dests;
            if (pDests)
                for (i in pDests) {
                    k = pDests[i];
                    addSquare(squares, k, 'premove-dest' + (s.pieces[k] ? ' oc' : ''));
                }
        }
    }
    const premove = s.premovable.current;
    if (premove)
        for (i in premove)
            addSquare(squares, premove[i], 'current-premove');
    else if (s.predroppable.current)
        addSquare(squares, s.predroppable.current.key, 'current-premove');
    const o = s.exploding;
    if (o)
        for (i in o.keys)
            addSquare(squares, o.keys[i], 'exploding' + o.stage);
    return squares;
}
function addSquare(squares, key, klass) {
    if (squares[key])
        squares[key] += ' ' + klass;
    else
        squares[key] = klass;
}

},{"./board":3,"./util":17}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fen = require("./fen");
const util_1 = require("./util");
function defaults() {
    return {
        pieces: fen.read(fen.initial, 0),
        orientation: 'white',
        turnColor: 'white',
        coordinates: true,
        autoCastle: true,
        viewOnly: false,
        disableContextMenu: false,
        resizable: true,
        addPieceZIndex: false,
        pieceKey: false,
        highlight: {
            lastMove: true,
            check: true
        },
        animation: {
            enabled: true,
            duration: 200
        },
        movable: {
            free: true,
            color: 'both',
            showDests: true,
            events: {},
            rookCastle: true
        },
        premovable: {
            enabled: true,
            showDests: true,
            castle: true,
            events: {}
        },
        predroppable: {
            enabled: false,
            events: {}
        },
        draggable: {
            enabled: true,
            distance: 3,
            autoDistance: true,
            centerPiece: true,
            showGhost: true,
            deleteOnDropOff: false
        },
        dropmode: {
            active: false
        },
        selectable: {
            enabled: true
        },
        stats: {
            dragged: !('ontouchstart' in window)
        },
        events: {},
        drawable: {
            enabled: true,
            visible: true,
            eraseOnClick: true,
            shapes: [],
            autoShapes: [],
            brushes: {
                green: { key: 'g', color: '#15781B', opacity: 1, lineWidth: 10 },
                red: { key: 'r', color: '#882020', opacity: 1, lineWidth: 10 },
                blue: { key: 'b', color: '#003088', opacity: 1, lineWidth: 10 },
                yellow: { key: 'y', color: '#e68f00', opacity: 1, lineWidth: 10 },
                paleBlue: { key: 'pb', color: '#003088', opacity: 0.4, lineWidth: 15 },
                paleGreen: { key: 'pg', color: '#15781B', opacity: 0.4, lineWidth: 15 },
                paleRed: { key: 'pr', color: '#882020', opacity: 0.4, lineWidth: 15 },
                paleGrey: { key: 'pgr', color: '#4a4a4a', opacity: 0.35, lineWidth: 15 }
            },
            pieces: {
                baseUrl: 'https://lichess1.org/assets/piece/cburnett/'
            },
            prevSvgHash: ''
        },
        hold: util_1.timer(),
        dimensions: { width: 8, height: 8 },
        geometry: 0,
    };
}
exports.defaults = defaults;

},{"./fen":11,"./util":17}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
function createElement(tagName) {
    return document.createElementNS('http://www.w3.org/2000/svg', tagName);
}
exports.createElement = createElement;
function renderSvg(state, root) {
    const d = state.drawable, curD = d.current, cur = curD && curD.mouseSq ? curD : undefined, arrowDests = {};
    d.shapes.concat(d.autoShapes).concat(cur ? [cur] : []).forEach(s => {
        if (s.dest)
            arrowDests[s.dest] = (arrowDests[s.dest] || 0) + 1;
    });
    const shapes = d.shapes.concat(d.autoShapes).map((s) => {
        return {
            shape: s,
            current: false,
            hash: shapeHash(s, arrowDests, false)
        };
    });
    if (cur)
        shapes.push({
            shape: cur,
            current: true,
            hash: shapeHash(cur, arrowDests, true)
        });
    const fullHash = shapes.map(sc => sc.hash).join('');
    if (fullHash === state.drawable.prevSvgHash)
        return;
    state.drawable.prevSvgHash = fullHash;
    const defsEl = root.firstChild;
    syncDefs(d, shapes, defsEl);
    syncShapes(state, shapes, d.brushes, arrowDests, root, defsEl);
}
exports.renderSvg = renderSvg;
function syncDefs(d, shapes, defsEl) {
    const brushes = {};
    let brush;
    shapes.forEach(s => {
        if (s.shape.dest) {
            brush = d.brushes[s.shape.brush];
            if (s.shape.modifiers)
                brush = makeCustomBrush(brush, s.shape.modifiers);
            brushes[brush.key] = brush;
        }
    });
    const keysInDom = {};
    let el = defsEl.firstChild;
    while (el) {
        keysInDom[el.getAttribute('cgKey')] = true;
        el = el.nextSibling;
    }
    for (let key in brushes) {
        if (!keysInDom[key])
            defsEl.appendChild(renderMarker(brushes[key]));
    }
}
function syncShapes(state, shapes, brushes, arrowDests, root, defsEl) {
    const bounds = state.dom.bounds(), hashesInDom = {}, toRemove = [];
    shapes.forEach(sc => { hashesInDom[sc.hash] = false; });
    let el = defsEl.nextSibling, elHash;
    while (el) {
        elHash = el.getAttribute('cgHash');
        if (hashesInDom.hasOwnProperty(elHash))
            hashesInDom[elHash] = true;
        else
            toRemove.push(el);
        el = el.nextSibling;
    }
    toRemove.forEach(el => root.removeChild(el));
    shapes.forEach(sc => {
        if (!hashesInDom[sc.hash])
            root.appendChild(renderShape(state, sc, brushes, arrowDests, bounds));
    });
}
function shapeHash({ orig, dest, brush, piece, modifiers }, arrowDests, current) {
    return [current, orig, dest, brush, dest && arrowDests[dest] > 1,
        piece && pieceHash(piece),
        modifiers && modifiersHash(modifiers)
    ].filter(x => x).join('');
}
function pieceHash(piece) {
    return [piece.color, piece.role, piece.scale].filter(x => x).join('');
}
function modifiersHash(m) {
    return '' + (m.lineWidth || '');
}
function renderShape(state, { shape, current, hash }, brushes, arrowDests, bounds) {
    const firstRankIs0 = state.dimensions.height === 10;
    let el;
    if (shape.piece)
        el = renderPiece(state.drawable.pieces.baseUrl, orient(util_1.key2pos(shape.orig, firstRankIs0), state.orientation, state.dimensions), shape.piece, bounds, state.dimensions);
    else {
        const orig = orient(util_1.key2pos(shape.orig, firstRankIs0), state.orientation, state.dimensions);
        if (shape.orig && shape.dest) {
            let brush = brushes[shape.brush];
            if (shape.modifiers)
                brush = makeCustomBrush(brush, shape.modifiers);
            el = renderArrow(brush, orig, orient(util_1.key2pos(shape.dest, firstRankIs0), state.orientation, state.dimensions), current, arrowDests[shape.dest] > 1, bounds, state.dimensions);
        }
        else
            el = renderCircle(brushes[shape.brush], orig, current, bounds, state.dimensions);
    }
    el.setAttribute('cgHash', hash);
    return el;
}
function renderCircle(brush, pos, current, bounds, bd) {
    const o = pos2px(pos, bounds, bd), widths = circleWidth(bounds, bd), radius = (bounds.width / bd.width) / 2;
    return setAttributes(createElement('circle'), {
        stroke: brush.color,
        'stroke-width': widths[current ? 0 : 1],
        fill: 'none',
        opacity: opacity(brush, current),
        cx: o[0],
        cy: o[1],
        r: radius - widths[1] / 2
    });
}
function renderArrow(brush, orig, dest, current, shorten, bounds, bd) {
    const m = arrowMargin(bounds, shorten && !current, bd), a = pos2px(orig, bounds, bd), b = pos2px(dest, bounds, bd), dx = b[0] - a[0], dy = b[1] - a[1], angle = Math.atan2(dy, dx), xo = Math.cos(angle) * m, yo = Math.sin(angle) * m;
    return setAttributes(createElement('line'), {
        stroke: brush.color,
        'stroke-width': lineWidth(brush, current, bounds, bd),
        'stroke-linecap': 'round',
        'marker-end': 'url(#arrowhead-' + brush.key + ')',
        opacity: opacity(brush, current),
        x1: a[0],
        y1: a[1],
        x2: b[0] - xo,
        y2: b[1] - yo
    });
}
function renderPiece(baseUrl, pos, piece, bounds, bd) {
    const o = pos2px(pos, bounds, bd), width = bounds.width / bd.width * (piece.scale || 1), height = bounds.width / bd.height * (piece.scale || 1), name = piece.color[0] + (piece.role === 'knight' ? 'n' : piece.role[0]).toUpperCase();
    return setAttributes(createElement('image'), {
        className: `${piece.role} ${piece.color}`,
        x: o[0] - width / 2,
        y: o[1] - height / 2,
        width: width,
        height: height,
        href: baseUrl + name + '.svg'
    });
}
function renderMarker(brush) {
    const marker = setAttributes(createElement('marker'), {
        id: 'arrowhead-' + brush.key,
        orient: 'auto',
        markerWidth: 4,
        markerHeight: 8,
        refX: 2.05,
        refY: 2.01
    });
    marker.appendChild(setAttributes(createElement('path'), {
        d: 'M0,0 V4 L3,2 Z',
        fill: brush.color
    }));
    marker.setAttribute('cgKey', brush.key);
    return marker;
}
function setAttributes(el, attrs) {
    for (let key in attrs)
        el.setAttribute(key, attrs[key]);
    return el;
}
function orient(pos, color, bd) {
    return color === 'white' ? pos : [bd.width + 1 - pos[0], bd.height + 1 - pos[1]];
}
function makeCustomBrush(base, modifiers) {
    const brush = {
        color: base.color,
        opacity: Math.round(base.opacity * 10) / 10,
        lineWidth: Math.round(modifiers.lineWidth || base.lineWidth)
    };
    brush.key = [base.key, modifiers.lineWidth].filter(x => x).join('');
    return brush;
}
function circleWidth(bounds, bd) {
    const base = bounds.width / (bd.width * 64);
    return [3 * base, 4 * base];
}
function lineWidth(brush, current, bounds, bd) {
    return (brush.lineWidth || 10) * (current ? 0.85 : 1) / (bd.width * 64) * bounds.width;
}
function opacity(brush, current) {
    return (brush.opacity || 1) * (current ? 0.9 : 1);
}
function arrowMargin(bounds, shorten, bd) {
    return (shorten ? 20 : 10) / (bd.width * 64) * bounds.width;
}
function pos2px(pos, bounds, bd) {
    return [(pos[0] - 0.5) * bounds.width / bd.width, (bd.height + 0.5 - pos[1]) * bounds.height / bd.height];
}

},{"./util":17}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
exports.ranks = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
;
exports.dimensions = [{ width: 8, height: 8 }, { width: 9, height: 9 }, { width: 10, height: 8 }, { width: 9, height: 10 }, { width: 10, height: 10 }];

},{}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cg = require("./types");
exports.colors = ['white', 'black'];
exports.NRanks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
exports.invNRanks = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
const files8 = cg.files.slice(0, 8);
const files9 = cg.files.slice(0, 9);
const files10 = cg.files.slice(0, 10);
const ranks8 = cg.ranks.slice(1, 9);
const ranks9 = cg.ranks.slice(1, 10);
const ranks10 = cg.ranks.slice(0, 10);
const allKeys8x8 = Array.prototype.concat(...files8.map(c => ranks8.map(r => c + r)));
const allKeys9x9 = Array.prototype.concat(...files9.map(c => ranks9.map(r => c + r)));
const allKeys10x8 = Array.prototype.concat(...files10.map(c => ranks8.map(r => c + r)));
const allKeys9x10 = Array.prototype.concat(...files9.map(c => ranks10.map(r => c + r)));
const allKeys10x10 = Array.prototype.concat(...files10.map(c => ranks10.map(r => c + r)));
exports.allKeys = [allKeys8x8, allKeys9x9, allKeys10x8, allKeys9x10, allKeys10x10];
function pos2key(pos, geom) {
    const bd = cg.dimensions[geom];
    return exports.allKeys[geom][bd.height * pos[0] + pos[1] - bd.height - 1];
}
exports.pos2key = pos2key;
function key2pos(k, firstRankIs0) {
    const shift = firstRankIs0 ? 1 : 0;
    return [k.charCodeAt(0) - 96, k.charCodeAt(1) - 48 + shift];
}
exports.key2pos = key2pos;
function memo(f) {
    let v;
    const ret = () => {
        if (v === undefined)
            v = f();
        return v;
    };
    ret.clear = () => { v = undefined; };
    return ret;
}
exports.memo = memo;
exports.timer = () => {
    let startAt;
    return {
        start() { startAt = performance.now(); },
        cancel() { startAt = undefined; },
        stop() {
            if (!startAt)
                return 0;
            const time = performance.now() - startAt;
            startAt = undefined;
            return time;
        }
    };
};
exports.opposite = (c) => c === 'white' ? 'black' : 'white';
function containsX(xs, x) {
    return xs !== undefined && xs.indexOf(x) !== -1;
}
exports.containsX = containsX;
exports.distanceSq = (pos1, pos2) => {
    return Math.pow(pos1[0] - pos2[0], 2) + Math.pow(pos1[1] - pos2[1], 2);
};
exports.samePiece = (p1, p2) => p1.role === p2.role && p1.color === p2.color;
const posToTranslateBase = (pos, asWhite, xFactor, yFactor, bt) => [
    (asWhite ? pos[0] - 1 : bt.width - pos[0]) * xFactor,
    (asWhite ? bt.height - pos[1] : pos[1] - 1) * yFactor
];
exports.posToTranslateAbs = (bounds, bt) => {
    const xFactor = bounds.width / bt.width, yFactor = bounds.height / bt.height;
    return (pos, asWhite) => posToTranslateBase(pos, asWhite, xFactor, yFactor, bt);
};
exports.posToTranslateRel = (pos, asWhite, bt) => posToTranslateBase(pos, asWhite, 100 / bt.width, 100 / bt.height, bt);
exports.translateAbs = (el, pos) => {
    el.style.transform = `translate(${pos[0]}px,${pos[1]}px)`;
};
exports.translateRel = (el, percents) => {
    el.style.left = percents[0] + '%';
    el.style.top = percents[1] + '%';
};
exports.setVisible = (el, v) => {
    el.style.visibility = v ? 'visible' : 'hidden';
};
exports.eventPosition = e => {
    if (e.clientX || e.clientX === 0)
        return [e.clientX, e.clientY];
    if (e.touches && e.targetTouches[0])
        return [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
    return undefined;
};
exports.isRightButton = (e) => e.buttons === 2 || e.button === 2;
exports.createEl = (tagName, className) => {
    const el = document.createElement(tagName);
    if (className)
        el.className = className;
    return el;
};

},{"./types":16}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const types_1 = require("./types");
const svg_1 = require("./svg");
function wrap(element, s, relative) {
    element.innerHTML = '';
    element.classList.add('cg-wrap');
    util_1.colors.forEach(c => element.classList.toggle('orientation-' + c, s.orientation === c));
    element.classList.toggle('manipulable', !s.viewOnly);
    const helper = util_1.createEl('cg-helper');
    element.appendChild(helper);
    const container = util_1.createEl('cg-container');
    helper.appendChild(container);
    const extension = util_1.createEl('extension');
    container.appendChild(extension);
    const board = util_1.createEl('cg-board');
    container.appendChild(board);
    let svg;
    if (s.drawable.visible && !relative) {
        svg = svg_1.createElement('svg');
        svg.appendChild(svg_1.createElement('defs'));
        container.appendChild(svg);
    }
    if (s.coordinates) {
        const orientClass = s.orientation === 'black' ? ' black' : '';
        const firstRankIs0 = s.geometry === 3;
        const shift = firstRankIs0 ? 0 : 1;
        container.appendChild(renderCoords(types_1.ranks.slice(shift, s.dimensions.height + shift), 'ranks' + orientClass));
        container.appendChild(renderCoords(types_1.files.slice(0, s.dimensions.width), 'files' + orientClass));
    }
    let ghost;
    if (s.draggable.showGhost && !relative) {
        ghost = util_1.createEl('piece', 'ghost');
        util_1.setVisible(ghost, false);
        container.appendChild(ghost);
    }
    return {
        board,
        container,
        ghost,
        svg
    };
}
exports.default = wrap;
function renderCoords(elems, className) {
    const el = util_1.createEl('coords', className);
    let f;
    for (let i in elems) {
        f = util_1.createEl('coord');
        f.textContent = elems[i];
        el.appendChild(f);
    }
    return el;
}

},{"./svg":15,"./types":16,"./util":17}],19:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vnode_1 = require("./vnode");
var is = require("./is");
function addNS(data, children, sel) {
    data.ns = 'http://www.w3.org/2000/svg';
    if (sel !== 'foreignObject' && children !== undefined) {
        for (var i = 0; i < children.length; ++i) {
            var childData = children[i].data;
            if (childData !== undefined) {
                addNS(childData, children[i].children, children[i].sel);
            }
        }
    }
}
function h(sel, b, c) {
    var data = {}, children, text, i;
    if (c !== undefined) {
        data = b;
        if (is.array(c)) {
            children = c;
        }
        else if (is.primitive(c)) {
            text = c;
        }
        else if (c && c.sel) {
            children = [c];
        }
    }
    else if (b !== undefined) {
        if (is.array(b)) {
            children = b;
        }
        else if (is.primitive(b)) {
            text = b;
        }
        else if (b && b.sel) {
            children = [b];
        }
        else {
            data = b;
        }
    }
    if (children !== undefined) {
        for (i = 0; i < children.length; ++i) {
            if (is.primitive(children[i]))
                children[i] = vnode_1.vnode(undefined, undefined, undefined, children[i], undefined);
        }
    }
    if (sel[0] === 's' && sel[1] === 'v' && sel[2] === 'g' &&
        (sel.length === 3 || sel[3] === '.' || sel[3] === '#')) {
        addNS(data, children, sel);
    }
    return vnode_1.vnode(sel, data, children, text, undefined);
}
exports.h = h;
;
exports.default = h;

},{"./is":21,"./vnode":29}],20:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function createElement(tagName) {
    return document.createElement(tagName);
}
function createElementNS(namespaceURI, qualifiedName) {
    return document.createElementNS(namespaceURI, qualifiedName);
}
function createTextNode(text) {
    return document.createTextNode(text);
}
function createComment(text) {
    return document.createComment(text);
}
function insertBefore(parentNode, newNode, referenceNode) {
    parentNode.insertBefore(newNode, referenceNode);
}
function removeChild(node, child) {
    node.removeChild(child);
}
function appendChild(node, child) {
    node.appendChild(child);
}
function parentNode(node) {
    return node.parentNode;
}
function nextSibling(node) {
    return node.nextSibling;
}
function tagName(elm) {
    return elm.tagName;
}
function setTextContent(node, text) {
    node.textContent = text;
}
function getTextContent(node) {
    return node.textContent;
}
function isElement(node) {
    return node.nodeType === 1;
}
function isText(node) {
    return node.nodeType === 3;
}
function isComment(node) {
    return node.nodeType === 8;
}
exports.htmlDomApi = {
    createElement: createElement,
    createElementNS: createElementNS,
    createTextNode: createTextNode,
    createComment: createComment,
    insertBefore: insertBefore,
    removeChild: removeChild,
    appendChild: appendChild,
    parentNode: parentNode,
    nextSibling: nextSibling,
    tagName: tagName,
    setTextContent: setTextContent,
    getTextContent: getTextContent,
    isElement: isElement,
    isText: isText,
    isComment: isComment,
};
exports.default = exports.htmlDomApi;

},{}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.array = Array.isArray;
function primitive(s) {
    return typeof s === 'string' || typeof s === 'number';
}
exports.primitive = primitive;

},{}],22:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var xlinkNS = 'http://www.w3.org/1999/xlink';
var xmlNS = 'http://www.w3.org/XML/1998/namespace';
var colonChar = 58;
var xChar = 120;
function updateAttrs(oldVnode, vnode) {
    var key, elm = vnode.elm, oldAttrs = oldVnode.data.attrs, attrs = vnode.data.attrs;
    if (!oldAttrs && !attrs)
        return;
    if (oldAttrs === attrs)
        return;
    oldAttrs = oldAttrs || {};
    attrs = attrs || {};
    // update modified attributes, add new attributes
    for (key in attrs) {
        var cur = attrs[key];
        var old = oldAttrs[key];
        if (old !== cur) {
            if (cur === true) {
                elm.setAttribute(key, "");
            }
            else if (cur === false) {
                elm.removeAttribute(key);
            }
            else {
                if (key.charCodeAt(0) !== xChar) {
                    elm.setAttribute(key, cur);
                }
                else if (key.charCodeAt(3) === colonChar) {
                    // Assume xml namespace
                    elm.setAttributeNS(xmlNS, key, cur);
                }
                else if (key.charCodeAt(5) === colonChar) {
                    // Assume xlink namespace
                    elm.setAttributeNS(xlinkNS, key, cur);
                }
                else {
                    elm.setAttribute(key, cur);
                }
            }
        }
    }
    // remove removed attributes
    // use `in` operator since the previous `for` iteration uses it (.i.e. add even attributes with undefined value)
    // the other option is to remove all attributes with value == undefined
    for (key in oldAttrs) {
        if (!(key in attrs)) {
            elm.removeAttribute(key);
        }
    }
}
exports.attributesModule = { create: updateAttrs, update: updateAttrs };
exports.default = exports.attributesModule;

},{}],23:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function updateClass(oldVnode, vnode) {
    var cur, name, elm = vnode.elm, oldClass = oldVnode.data.class, klass = vnode.data.class;
    if (!oldClass && !klass)
        return;
    if (oldClass === klass)
        return;
    oldClass = oldClass || {};
    klass = klass || {};
    for (name in oldClass) {
        if (!klass[name]) {
            elm.classList.remove(name);
        }
    }
    for (name in klass) {
        cur = klass[name];
        if (cur !== oldClass[name]) {
            elm.classList[cur ? 'add' : 'remove'](name);
        }
    }
}
exports.classModule = { create: updateClass, update: updateClass };
exports.default = exports.classModule;

},{}],24:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function invokeHandler(handler, vnode, event) {
    if (typeof handler === "function") {
        // call function handler
        handler.call(vnode, event, vnode);
    }
    else if (typeof handler === "object") {
        // call handler with arguments
        if (typeof handler[0] === "function") {
            // special case for single argument for performance
            if (handler.length === 2) {
                handler[0].call(vnode, handler[1], event, vnode);
            }
            else {
                var args = handler.slice(1);
                args.push(event);
                args.push(vnode);
                handler[0].apply(vnode, args);
            }
        }
        else {
            // call multiple handlers
            for (var i = 0; i < handler.length; i++) {
                invokeHandler(handler[i], vnode, event);
            }
        }
    }
}
function handleEvent(event, vnode) {
    var name = event.type, on = vnode.data.on;
    // call event handler(s) if exists
    if (on && on[name]) {
        invokeHandler(on[name], vnode, event);
    }
}
function createListener() {
    return function handler(event) {
        handleEvent(event, handler.vnode);
    };
}
function updateEventListeners(oldVnode, vnode) {
    var oldOn = oldVnode.data.on, oldListener = oldVnode.listener, oldElm = oldVnode.elm, on = vnode && vnode.data.on, elm = (vnode && vnode.elm), name;
    // optimization for reused immutable handlers
    if (oldOn === on) {
        return;
    }
    // remove existing listeners which no longer used
    if (oldOn && oldListener) {
        // if element changed or deleted we remove all existing listeners unconditionally
        if (!on) {
            for (name in oldOn) {
                // remove listener if element was changed or existing listeners removed
                oldElm.removeEventListener(name, oldListener, false);
            }
        }
        else {
            for (name in oldOn) {
                // remove listener if existing listener removed
                if (!on[name]) {
                    oldElm.removeEventListener(name, oldListener, false);
                }
            }
        }
    }
    // add new listeners which has not already attached
    if (on) {
        // reuse existing listener or create new
        var listener = vnode.listener = oldVnode.listener || createListener();
        // update vnode for listener
        listener.vnode = vnode;
        // if element changed or added we add all needed listeners unconditionally
        if (!oldOn) {
            for (name in on) {
                // add listener if element was changed or new listeners added
                elm.addEventListener(name, listener, false);
            }
        }
        else {
            for (name in on) {
                // add listener if new listener added
                if (!oldOn[name]) {
                    elm.addEventListener(name, listener, false);
                }
            }
        }
    }
}
exports.eventListenersModule = {
    create: updateEventListeners,
    update: updateEventListeners,
    destroy: updateEventListeners
};
exports.default = exports.eventListenersModule;

},{}],25:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function updateProps(oldVnode, vnode) {
    var key, cur, old, elm = vnode.elm, oldProps = oldVnode.data.props, props = vnode.data.props;
    if (!oldProps && !props)
        return;
    if (oldProps === props)
        return;
    oldProps = oldProps || {};
    props = props || {};
    for (key in oldProps) {
        if (!props[key]) {
            delete elm[key];
        }
    }
    for (key in props) {
        cur = props[key];
        old = oldProps[key];
        if (old !== cur && (key !== 'value' || elm[key] !== cur)) {
            elm[key] = cur;
        }
    }
}
exports.propsModule = { create: updateProps, update: updateProps };
exports.default = exports.propsModule;

},{}],26:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vnode_1 = require("./vnode");
var is = require("./is");
var htmldomapi_1 = require("./htmldomapi");
function isUndef(s) { return s === undefined; }
function isDef(s) { return s !== undefined; }
var emptyNode = vnode_1.default('', {}, [], undefined, undefined);
function sameVnode(vnode1, vnode2) {
    return vnode1.key === vnode2.key && vnode1.sel === vnode2.sel;
}
function isVnode(vnode) {
    return vnode.sel !== undefined;
}
function createKeyToOldIdx(children, beginIdx, endIdx) {
    var i, map = {}, key, ch;
    for (i = beginIdx; i <= endIdx; ++i) {
        ch = children[i];
        if (ch != null) {
            key = ch.key;
            if (key !== undefined)
                map[key] = i;
        }
    }
    return map;
}
var hooks = ['create', 'update', 'remove', 'destroy', 'pre', 'post'];
var h_1 = require("./h");
exports.h = h_1.h;
var thunk_1 = require("./thunk");
exports.thunk = thunk_1.thunk;
function init(modules, domApi) {
    var i, j, cbs = {};
    var api = domApi !== undefined ? domApi : htmldomapi_1.default;
    for (i = 0; i < hooks.length; ++i) {
        cbs[hooks[i]] = [];
        for (j = 0; j < modules.length; ++j) {
            var hook = modules[j][hooks[i]];
            if (hook !== undefined) {
                cbs[hooks[i]].push(hook);
            }
        }
    }
    function emptyNodeAt(elm) {
        var id = elm.id ? '#' + elm.id : '';
        var c = elm.className ? '.' + elm.className.split(' ').join('.') : '';
        return vnode_1.default(api.tagName(elm).toLowerCase() + id + c, {}, [], undefined, elm);
    }
    function createRmCb(childElm, listeners) {
        return function rmCb() {
            if (--listeners === 0) {
                var parent_1 = api.parentNode(childElm);
                api.removeChild(parent_1, childElm);
            }
        };
    }
    function createElm(vnode, insertedVnodeQueue) {
        var i, data = vnode.data;
        if (data !== undefined) {
            if (isDef(i = data.hook) && isDef(i = i.init)) {
                i(vnode);
                data = vnode.data;
            }
        }
        var children = vnode.children, sel = vnode.sel;
        if (sel === '!') {
            if (isUndef(vnode.text)) {
                vnode.text = '';
            }
            vnode.elm = api.createComment(vnode.text);
        }
        else if (sel !== undefined) {
            // Parse selector
            var hashIdx = sel.indexOf('#');
            var dotIdx = sel.indexOf('.', hashIdx);
            var hash = hashIdx > 0 ? hashIdx : sel.length;
            var dot = dotIdx > 0 ? dotIdx : sel.length;
            var tag = hashIdx !== -1 || dotIdx !== -1 ? sel.slice(0, Math.min(hash, dot)) : sel;
            var elm = vnode.elm = isDef(data) && isDef(i = data.ns) ? api.createElementNS(i, tag)
                : api.createElement(tag);
            if (hash < dot)
                elm.setAttribute('id', sel.slice(hash + 1, dot));
            if (dotIdx > 0)
                elm.setAttribute('class', sel.slice(dot + 1).replace(/\./g, ' '));
            for (i = 0; i < cbs.create.length; ++i)
                cbs.create[i](emptyNode, vnode);
            if (is.array(children)) {
                for (i = 0; i < children.length; ++i) {
                    var ch = children[i];
                    if (ch != null) {
                        api.appendChild(elm, createElm(ch, insertedVnodeQueue));
                    }
                }
            }
            else if (is.primitive(vnode.text)) {
                api.appendChild(elm, api.createTextNode(vnode.text));
            }
            i = vnode.data.hook; // Reuse variable
            if (isDef(i)) {
                if (i.create)
                    i.create(emptyNode, vnode);
                if (i.insert)
                    insertedVnodeQueue.push(vnode);
            }
        }
        else {
            vnode.elm = api.createTextNode(vnode.text);
        }
        return vnode.elm;
    }
    function addVnodes(parentElm, before, vnodes, startIdx, endIdx, insertedVnodeQueue) {
        for (; startIdx <= endIdx; ++startIdx) {
            var ch = vnodes[startIdx];
            if (ch != null) {
                api.insertBefore(parentElm, createElm(ch, insertedVnodeQueue), before);
            }
        }
    }
    function invokeDestroyHook(vnode) {
        var i, j, data = vnode.data;
        if (data !== undefined) {
            if (isDef(i = data.hook) && isDef(i = i.destroy))
                i(vnode);
            for (i = 0; i < cbs.destroy.length; ++i)
                cbs.destroy[i](vnode);
            if (vnode.children !== undefined) {
                for (j = 0; j < vnode.children.length; ++j) {
                    i = vnode.children[j];
                    if (i != null && typeof i !== "string") {
                        invokeDestroyHook(i);
                    }
                }
            }
        }
    }
    function removeVnodes(parentElm, vnodes, startIdx, endIdx) {
        for (; startIdx <= endIdx; ++startIdx) {
            var i_1 = void 0, listeners = void 0, rm = void 0, ch = vnodes[startIdx];
            if (ch != null) {
                if (isDef(ch.sel)) {
                    invokeDestroyHook(ch);
                    listeners = cbs.remove.length + 1;
                    rm = createRmCb(ch.elm, listeners);
                    for (i_1 = 0; i_1 < cbs.remove.length; ++i_1)
                        cbs.remove[i_1](ch, rm);
                    if (isDef(i_1 = ch.data) && isDef(i_1 = i_1.hook) && isDef(i_1 = i_1.remove)) {
                        i_1(ch, rm);
                    }
                    else {
                        rm();
                    }
                }
                else {
                    api.removeChild(parentElm, ch.elm);
                }
            }
        }
    }
    function updateChildren(parentElm, oldCh, newCh, insertedVnodeQueue) {
        var oldStartIdx = 0, newStartIdx = 0;
        var oldEndIdx = oldCh.length - 1;
        var oldStartVnode = oldCh[0];
        var oldEndVnode = oldCh[oldEndIdx];
        var newEndIdx = newCh.length - 1;
        var newStartVnode = newCh[0];
        var newEndVnode = newCh[newEndIdx];
        var oldKeyToIdx;
        var idxInOld;
        var elmToMove;
        var before;
        while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
            if (oldStartVnode == null) {
                oldStartVnode = oldCh[++oldStartIdx]; // Vnode might have been moved left
            }
            else if (oldEndVnode == null) {
                oldEndVnode = oldCh[--oldEndIdx];
            }
            else if (newStartVnode == null) {
                newStartVnode = newCh[++newStartIdx];
            }
            else if (newEndVnode == null) {
                newEndVnode = newCh[--newEndIdx];
            }
            else if (sameVnode(oldStartVnode, newStartVnode)) {
                patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
                oldStartVnode = oldCh[++oldStartIdx];
                newStartVnode = newCh[++newStartIdx];
            }
            else if (sameVnode(oldEndVnode, newEndVnode)) {
                patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
                oldEndVnode = oldCh[--oldEndIdx];
                newEndVnode = newCh[--newEndIdx];
            }
            else if (sameVnode(oldStartVnode, newEndVnode)) {
                patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
                api.insertBefore(parentElm, oldStartVnode.elm, api.nextSibling(oldEndVnode.elm));
                oldStartVnode = oldCh[++oldStartIdx];
                newEndVnode = newCh[--newEndIdx];
            }
            else if (sameVnode(oldEndVnode, newStartVnode)) {
                patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
                api.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
                oldEndVnode = oldCh[--oldEndIdx];
                newStartVnode = newCh[++newStartIdx];
            }
            else {
                if (oldKeyToIdx === undefined) {
                    oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
                }
                idxInOld = oldKeyToIdx[newStartVnode.key];
                if (isUndef(idxInOld)) {
                    api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm);
                    newStartVnode = newCh[++newStartIdx];
                }
                else {
                    elmToMove = oldCh[idxInOld];
                    if (elmToMove.sel !== newStartVnode.sel) {
                        api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm);
                    }
                    else {
                        patchVnode(elmToMove, newStartVnode, insertedVnodeQueue);
                        oldCh[idxInOld] = undefined;
                        api.insertBefore(parentElm, elmToMove.elm, oldStartVnode.elm);
                    }
                    newStartVnode = newCh[++newStartIdx];
                }
            }
        }
        if (oldStartIdx <= oldEndIdx || newStartIdx <= newEndIdx) {
            if (oldStartIdx > oldEndIdx) {
                before = newCh[newEndIdx + 1] == null ? null : newCh[newEndIdx + 1].elm;
                addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
            }
            else {
                removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
            }
        }
    }
    function patchVnode(oldVnode, vnode, insertedVnodeQueue) {
        var i, hook;
        if (isDef(i = vnode.data) && isDef(hook = i.hook) && isDef(i = hook.prepatch)) {
            i(oldVnode, vnode);
        }
        var elm = vnode.elm = oldVnode.elm;
        var oldCh = oldVnode.children;
        var ch = vnode.children;
        if (oldVnode === vnode)
            return;
        if (vnode.data !== undefined) {
            for (i = 0; i < cbs.update.length; ++i)
                cbs.update[i](oldVnode, vnode);
            i = vnode.data.hook;
            if (isDef(i) && isDef(i = i.update))
                i(oldVnode, vnode);
        }
        if (isUndef(vnode.text)) {
            if (isDef(oldCh) && isDef(ch)) {
                if (oldCh !== ch)
                    updateChildren(elm, oldCh, ch, insertedVnodeQueue);
            }
            else if (isDef(ch)) {
                if (isDef(oldVnode.text))
                    api.setTextContent(elm, '');
                addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
            }
            else if (isDef(oldCh)) {
                removeVnodes(elm, oldCh, 0, oldCh.length - 1);
            }
            else if (isDef(oldVnode.text)) {
                api.setTextContent(elm, '');
            }
        }
        else if (oldVnode.text !== vnode.text) {
            if (isDef(oldCh)) {
                removeVnodes(elm, oldCh, 0, oldCh.length - 1);
            }
            api.setTextContent(elm, vnode.text);
        }
        if (isDef(hook) && isDef(i = hook.postpatch)) {
            i(oldVnode, vnode);
        }
    }
    return function patch(oldVnode, vnode) {
        var i, elm, parent;
        var insertedVnodeQueue = [];
        for (i = 0; i < cbs.pre.length; ++i)
            cbs.pre[i]();
        if (!isVnode(oldVnode)) {
            oldVnode = emptyNodeAt(oldVnode);
        }
        if (sameVnode(oldVnode, vnode)) {
            patchVnode(oldVnode, vnode, insertedVnodeQueue);
        }
        else {
            elm = oldVnode.elm;
            parent = api.parentNode(elm);
            createElm(vnode, insertedVnodeQueue);
            if (parent !== null) {
                api.insertBefore(parent, vnode.elm, api.nextSibling(elm));
                removeVnodes(parent, [oldVnode], 0, 0);
            }
        }
        for (i = 0; i < insertedVnodeQueue.length; ++i) {
            insertedVnodeQueue[i].data.hook.insert(insertedVnodeQueue[i]);
        }
        for (i = 0; i < cbs.post.length; ++i)
            cbs.post[i]();
        return vnode;
    };
}
exports.init = init;

},{"./h":19,"./htmldomapi":20,"./is":21,"./thunk":27,"./vnode":29}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var h_1 = require("./h");
function copyToThunk(vnode, thunk) {
    thunk.elm = vnode.elm;
    vnode.data.fn = thunk.data.fn;
    vnode.data.args = thunk.data.args;
    thunk.data = vnode.data;
    thunk.children = vnode.children;
    thunk.text = vnode.text;
    thunk.elm = vnode.elm;
}
function init(thunk) {
    var cur = thunk.data;
    var vnode = cur.fn.apply(undefined, cur.args);
    copyToThunk(vnode, thunk);
}
function prepatch(oldVnode, thunk) {
    var i, old = oldVnode.data, cur = thunk.data;
    var oldArgs = old.args, args = cur.args;
    if (old.fn !== cur.fn || oldArgs.length !== args.length) {
        copyToThunk(cur.fn.apply(undefined, args), thunk);
        return;
    }
    for (i = 0; i < args.length; ++i) {
        if (oldArgs[i] !== args[i]) {
            copyToThunk(cur.fn.apply(undefined, args), thunk);
            return;
        }
    }
    copyToThunk(oldVnode, thunk);
}
exports.thunk = function thunk(sel, key, fn, args) {
    if (args === undefined) {
        args = fn;
        fn = key;
        key = undefined;
    }
    return h_1.h(sel, {
        key: key,
        hook: { init: init, prepatch: prepatch },
        fn: fn,
        args: args
    });
};
exports.default = exports.thunk;

},{"./h":19}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vnode_1 = require("./vnode");
var htmldomapi_1 = require("./htmldomapi");
function toVNode(node, domApi) {
    var api = domApi !== undefined ? domApi : htmldomapi_1.default;
    var text;
    if (api.isElement(node)) {
        var id = node.id ? '#' + node.id : '';
        var cn = node.getAttribute('class');
        var c = cn ? '.' + cn.split(' ').join('.') : '';
        var sel = api.tagName(node).toLowerCase() + id + c;
        var attrs = {};
        var children = [];
        var name_1;
        var i = void 0, n = void 0;
        var elmAttrs = node.attributes;
        var elmChildren = node.childNodes;
        for (i = 0, n = elmAttrs.length; i < n; i++) {
            name_1 = elmAttrs[i].nodeName;
            if (name_1 !== 'id' && name_1 !== 'class') {
                attrs[name_1] = elmAttrs[i].nodeValue;
            }
        }
        for (i = 0, n = elmChildren.length; i < n; i++) {
            children.push(toVNode(elmChildren[i], domApi));
        }
        return vnode_1.default(sel, { attrs: attrs }, children, undefined, node);
    }
    else if (api.isText(node)) {
        text = api.getTextContent(node);
        return vnode_1.default(undefined, undefined, undefined, text, node);
    }
    else if (api.isComment(node)) {
        text = api.getTextContent(node);
        return vnode_1.default('!', {}, [], text, node);
    }
    else {
        return vnode_1.default('', {}, [], undefined, node);
    }
}
exports.toVNode = toVNode;
exports.default = toVNode;

},{"./htmldomapi":20,"./vnode":29}],29:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function vnode(sel, data, children, text, elm) {
    var key = data === undefined ? undefined : data.key;
    return { sel: sel, data: data, children: children,
        text: text, elm: elm, key: key };
}
exports.vnode = vnode;
exports.default = vnode;

},{}],30:[function(require,module,exports){
function noop() {}

module.exports = function (url, opts) {
	opts = opts || {};

	var ws, num=0, timer=1, $={};
	var max = opts.maxAttempts || Infinity;

	$.open = function () {
		ws = new WebSocket(url, opts.protocols || []);

		ws.onmessage = opts.onmessage || noop;

		ws.onopen = function (e) {
			(opts.onopen || noop)(e);
			num = 0;
		};

		ws.onclose = function (e) {
			e.code === 1e3 || e.code === 1001 || e.code === 1005 || $.reconnect(e);
			(opts.onclose || noop)(e);
		};

		ws.onerror = function (e) {
			(e && e.code==='ECONNREFUSED') ? $.reconnect(e) : (opts.onerror || noop)(e);
		};
	};

	$.reconnect = function (e) {
		if (timer && num++ < max) {
			timer = setTimeout(function () {
				(opts.onreconnect || noop)(e);
				$.open();
			}, opts.timeout || 1e3);
		} else {
			(opts.onmaximum || noop)(e);
		}
	};

	$.json = function (x) {
		ws.send(JSON.stringify(x));
	};

	$.send = function (x) {
		ws.send(x);
	};

	$.close = function (x, y) {
		timer = clearTimeout(timer);
		ws.close(x || 1e3, y);
	};

	$.open(); // init

	return $;
}

},{}],31:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const h_1 = __importDefault(require("snabbdom/h"));
const user_1 = require("./user");
function aboutView(model) {
    user_1.renderUsername(model["home"], model["username"]);
    console.log(model);
    return [h_1.default('aside.sidebar-first'),
        h_1.default('main.main', [
            h_1.default('div.about', [
                h_1.default('h2', "About pychess-variants"),
                h_1.default('p', "pychess-variants is a free, open-source chess server designed to play several chess variant."),
                h_1.default('p', [
                    "Currently supported games are ",
                    h_1.default('a', { attrs: { href: 'https://en.wikipedia.org/wiki/Makruk' } }, 'Makruk'),
                    ", ",
                    h_1.default('a', { attrs: { href: 'https://en.wikipedia.org/wiki/Sittuyin' } }, 'Sittuyin'),
                    ", ",
                    h_1.default('a', { attrs: { href: 'https://en.wikipedia.org/wiki/Shogi' } }, 'Shogi'),
                    ", ",
                    h_1.default('a', { attrs: { href: 'https://en.wikipedia.org/wiki/Xiangqi' } }, 'Xiangqi'),
                    ", ",
                    h_1.default('a', { attrs: { href: 'http://www.quantumgambitz.com/blog/chess/cga/bronstein-chess-pre-chess-shuffle-chess' } }, 'Placement'),
                    ", ",
                    h_1.default('a', { attrs: { href: 'https://en.wikipedia.org/wiki/Crazyhouse' } }, 'Crazyhouse'),
                    ", ",
                    h_1.default('a', { attrs: { href: 'https://en.wikipedia.org/wiki/Seirawan_Chess' } }, 'Seirawan'),
                    ", ",
                    h_1.default('a', { attrs: { href: 'https://en.wikipedia.org/wiki/Capablanca_Chess' } }, 'Capablanca'),
                    ", ",
                    h_1.default('a', { attrs: { href: 'https://en.wikipedia.org/wiki/Grand_Chess' } }, 'Grand chess'),
                    ", ",
                    h_1.default('a', { attrs: { href: 'https://pychess-variants.herokuapp.com/IRVxMG72' } }, 'Shouse (Seirawan+Crazyhouse)'),
                    ", ",
                    h_1.default('a', { attrs: { href: 'https://www.twitch.tv/videos/466253815' } }, 'Capahouse (Capablanca+Crazyhouse)'),
                    ", ",
                    h_1.default('a', { attrs: { href: 'https://www.twitch.tv/videos/476859273' } }, 'Grandhouse (Grand+Crazyhouse)'),
                    " and standard ",
                    h_1.default('a', { attrs: { href: 'https://en.wikipedia.org/wiki/Chess' } }, 'Chess.'),
                ]),
                h_1.default('p', ['Additionally you can check Chess960 option in for Standard, Crazyhouse, Capablanca and Capahouse to start games from random positions with ',
                    h_1.default('a', { attrs: { href: 'https://en.wikipedia.org/wiki/Chess960#Castling_rules' } }, 'Chess960 castling rules.')
                ]),
                h_1.default('p', [
                    'For move generation, validation and engine play it uses ',
                    h_1.default('a', { attrs: { href: 'https://github.com/gbtami/Fairy-Stockfish' } }, 'Fairy-Stockfish'),
                    ", ",
                    h_1.default('a', { attrs: { href: 'https://github.com/xqbase/eleeye' } }, 'ElephantEye'),
                    ", ",
                    h_1.default('a', { attrs: { href: 'https://github.com/walker8088/moonfish' } }, 'moonfish'),
                    " and ",
                    h_1.default('a', { attrs: { href: 'https://github.com/gbtami/lichess-bot-variants' } }, 'lichess-bot-variants.'),
                ]),
                h_1.default('p', [
                    'On client side it is based on ',
                    h_1.default('a', { attrs: { href: 'https://github.com/gbtami/chessgroundx' } }, 'chessgroundx.'),
                ]),
                h_1.default('p', [
                    'Source code of server is available at ',
                    h_1.default('a', { attrs: { href: 'https://github.com/gbtami/pychess-variants' } }, 'GitHub.'),
                ]),
            ]),
            h_1.default('aside.sidebar-second'),
        ]),
    ];
}
exports.aboutView = aboutView;

},{"./user":51,"snabbdom/h":19}],32:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const analysisCtrl_1 = __importDefault(require("./analysisCtrl"));
const chess_1 = require("./chess");
const clock_1 = require("./clock");
function runGround(vnode, model) {
    const el = vnode.elm;
    const ctrl = new analysisCtrl_1.default(el, model);
    const cg = ctrl.chessground;
    window['cg'] = cg;
}
function analysisView(model) {
    console.log("analysisView model=", model);
    const dataIcon = chess_1.VARIANTS[model["variant"]].icon;
    clock_1.renderTimeago();
    return [snabbdom_1.h('aside.sidebar-first', [
            snabbdom_1.h('div.game-info', [
                snabbdom_1.h('div.info0', { attrs: { "data-icon": dataIcon }, class: { "icon": true } }, [
                    snabbdom_1.h('div.info1', { attrs: { "data-icon": (model["chess960"] === 'True') ? "V" : "" }, class: { "icon": true } }),
                    snabbdom_1.h('div.info2', [
                        snabbdom_1.h('div.tc', model["base"] + "+" + model["inc"] + " • Casual • " + model["variant"]),
                        Number(model["status"]) >= 0 ? snabbdom_1.h('info-date', { attrs: { timestamp: model["date"] } }, clock_1.timeago(model["date"])) : "Playing right now",
                    ]),
                ]),
                snabbdom_1.h('div.player-data', [
                    snabbdom_1.h('i-side.online', { class: { "icon": true, "icon-white": true } }),
                    snabbdom_1.h('player', [
                        snabbdom_1.h('a.user-link', { attrs: { href: '/@/' + model["wplayer"] } }, [
                            snabbdom_1.h('player-title', " " + model["wtitle"] + " "),
                            model["wplayer"] + " (1500?)",
                        ]),
                    ]),
                ]),
                snabbdom_1.h('div.player-data', [
                    snabbdom_1.h('i-side.online', { class: { "icon": true, "icon-black": true } }),
                    snabbdom_1.h('player', [
                        snabbdom_1.h('a.user-link', { attrs: { href: '/@/' + model["bplayer"] } }, [
                            snabbdom_1.h('player-title', " " + model["btitle"] + " "),
                            model["bplayer"] + " (1500?)",
                        ]),
                    ]),
                ]),
            ]),
            snabbdom_1.h('div.roundchat#roundchat'),
        ]),
        snabbdom_1.h('main.main', [
            snabbdom_1.h('selection.' + chess_1.VARIANTS[model["variant"]].board + '.' + chess_1.VARIANTS[model["variant"]].pieces, [
                snabbdom_1.h('div.cg-wrap.' + chess_1.VARIANTS[model["variant"]].cg, { hook: { insert: (vnode) => runGround(vnode, model) },
                }),
            ]),
        ]),
        snabbdom_1.h('aside.sidebar-second', [
            snabbdom_1.h('div#pocket-wrapper', [
                snabbdom_1.h('div.' + chess_1.VARIANTS[model["variant"]].pieces + '.' + model["variant"], [
                    snabbdom_1.h('div.cg-wrap.pocket', [
                        snabbdom_1.h('div#pocket0'),
                    ]),
                ]),
            ]),
            snabbdom_1.h('div.round-data', [
                snabbdom_1.h('div#move-controls'),
                snabbdom_1.h('div#board-settings'),
                snabbdom_1.h('div#movelist-block', [
                    snabbdom_1.h('div#movelist'),
                    snabbdom_1.h('div#result'),
                ]),
            ]),
            snabbdom_1.h('div#pocket-wrapper', [
                snabbdom_1.h('div.' + chess_1.VARIANTS[model["variant"]].pieces + '.' + model["variant"], [
                    snabbdom_1.h('div.cg-wrap.pocket', [
                        snabbdom_1.h('div#pocket1'),
                    ]),
                ]),
            ]),
            snabbdom_1.h('div#flip'),
        ]),
        snabbdom_1.h('under-left', "Spectators"),
        snabbdom_1.h('under-board', [
            snabbdom_1.h('div.#pgn')
        ])
    ];
}
exports.analysisView = analysisView;

},{"./analysisCtrl":33,"./chess":35,"./clock":36,"snabbdom":26}],33:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sockette_1 = __importDefault(require("sockette"));
const snabbdom_1 = require("snabbdom");
const h_1 = require("snabbdom/h");
const class_1 = __importDefault(require("snabbdom/modules/class"));
const attributes_1 = __importDefault(require("snabbdom/modules/attributes"));
const props_1 = __importDefault(require("snabbdom/modules/props"));
const eventlisteners_1 = __importDefault(require("snabbdom/modules/eventlisteners"));
const util_1 = require("chessgroundx/util");
const chessgroundx_1 = require("chessgroundx");
const gating_1 = __importDefault(require("./gating"));
const promotion_1 = __importDefault(require("./promotion"));
const pocket_1 = require("./pocket");
const sound_1 = require("./sound");
const chess_1 = require("./chess");
const chat_1 = require("./chat");
const settings_1 = require("./settings");
const movelist_1 = require("./movelist");
const resize_1 = __importDefault(require("./resize"));
const profile_1 = require("./profile");
const patch = snabbdom_1.init([class_1.default, attributes_1.default, props_1.default, eventlisteners_1.default]);
class AnalysisController {
    constructor(el, model) {
        this.getGround = () => this.chessground;
        this.getDests = () => this.dests;
        this.gameOver = () => {
            var container = document.getElementById('result');
            patch(container, h_1.h('div#result', profile_1.result(this.status, this.result)));
        };
        this.checkStatus = (msg) => {
            if (msg.gameId !== this.model["gameId"])
                return;
            if (msg.status >= 0 && this.result === "") {
                this.result = msg.result;
                this.status = msg.status;
                this.gameOver();
                this.pgn = msg.pgn;
                var container = document.getElementById('pgn');
                this.vpng = patch(container, h_1.h('div#pgn', [h_1.h('div', this.fullfen), h_1.h('textarea', { attrs: { rows: 13, readonly: true, spellcheck: false } }, msg.pgn)]));
                movelist_1.selectMove(this, this.ply);
                // TODO: move this to (not implemented yet) analysis page
                //console.log("ANALYSIS");
                //this.doSend({ type: "analysis", username: this.model["username"], gameId: this.model["gameId"] });
            }
        };
        this.onMsgBoard = (msg) => {
            if (msg.gameId !== this.model["gameId"])
                return;
            // console.log("got board msg:", msg);
            this.ply = msg.ply;
            this.fullfen = msg.fen;
            this.dests = msg.dests;
            // list of legal promotion moves
            this.promotions = msg.promo;
            const parts = msg.fen.split(" ");
            this.turnColor = parts[1] === "w" ? "white" : "black";
            if (msg.steps.length > 1) {
                this.steps = [];
                var container = document.getElementById('movelist');
                patch(container, h_1.h('div#movelist'));
                msg.steps.forEach((step) => {
                    this.steps.push(step);
                    movelist_1.updateMovelist(this);
                });
            }
            else {
                if (msg.ply === this.steps.length) {
                    const step = {
                        'fen': msg.fen,
                        'move': msg.lastMove,
                        'check': msg.check,
                        'turnColor': this.turnColor,
                        'san': msg.steps[0].san,
                    };
                    this.steps.push(step);
                    movelist_1.updateMovelist(this);
                }
            }
            var lastMove = msg.lastMove;
            if (lastMove !== null) {
                if (this.variant === "shogi") {
                    lastMove = chess_1.usi2uci(lastMove);
                }
                else if (this.variant === "grand" || this.variant === "grandhouse") {
                    lastMove = chess_1.grand2zero(lastMove);
                }
                lastMove = [lastMove.slice(0, 2), lastMove.slice(2, 4)];
            }
            // drop lastMove causing scrollbar flicker,
            // so we remove from part to avoid that
            if (lastMove !== null && lastMove[0][1] === '@')
                lastMove = [lastMove[1]];
            // save capture state before updating chessground
            const capture = lastMove !== null && this.chessground.state.pieces[lastMove[1]];
            if (lastMove !== null && (this.turnColor === this.mycolor || this.spectator)) {
                if (this.variant === "shogi") {
                    sound_1.sound.shogimove();
                }
                else {
                    if (capture) {
                        sound_1.sound.capture();
                    }
                    else {
                        sound_1.sound.move();
                    }
                }
            }
            else {
                lastMove = [];
            }
            this.checkStatus(msg);
            if (msg.check) {
                sound_1.sound.check();
            }
            if (this.spectator) {
                this.chessground.set({
                    fen: parts[0],
                    turnColor: this.turnColor,
                    check: msg.check,
                    lastMove: lastMove,
                });
                pocket_1.updatePockets(this, this.vpocket0, this.vpocket1);
            }
            ;
        };
        this.goPly = (ply) => {
            const step = this.steps[ply];
            var move = step['move'];
            var capture = false;
            if (move !== undefined) {
                if (this.variant === "shogi")
                    move = chess_1.usi2uci(move);
                if (this.variant === "grand" || this.variant === "grandhouse")
                    move = chess_1.grand2zero(move);
                move = move.slice(1, 2) === '@' ? [move.slice(2, 4)] : [move.slice(0, 2), move.slice(2, 4)];
                capture = this.chessground.state.pieces[move[move.length - 1]] !== undefined;
            }
            this.chessground.set({
                fen: step.fen,
                turnColor: step.turnColor,
                movable: {
                    free: false,
                    color: this.spectator ? undefined : step.turnColor,
                    dests: this.result === "" && ply === this.steps.length - 1 ? this.dests : undefined,
                },
                check: step.check,
                lastMove: move,
            });
            this.fullfen = step.fen;
            pocket_1.updatePockets(this, this.vpocket0, this.vpocket1);
            if (ply === this.ply + 1) {
                if (this.variant === "shogi") {
                    sound_1.sound.shogimove();
                }
                else {
                    if (capture) {
                        sound_1.sound.capture();
                    }
                    else {
                        sound_1.sound.move();
                    }
                }
            }
            this.ply = ply;
            this.vpng = patch(this.vpng, h_1.h('div#pgn', [h_1.h('div', this.fullfen), h_1.h('textarea', { attrs: { rows: 13, readonly: true, spellcheck: false } }, this.pgn)]));
        };
        this.doSend = (message) => {
            console.log("---> doSend():", message);
            this.sock.send(JSON.stringify(message));
        };
        this.sendMove = (orig, dest, promo) => {
            // pause() will add increment!
            // console.log("sendMove(orig, dest, prom)", orig, dest, promo);
            const uci_move = orig + dest + promo;
            const move = this.variant === "shogi" ? chess_1.uci2usi(uci_move) : (this.variant === "grand" || this.variant === "grandhouse") ? chess_1.zero2grand(uci_move) : uci_move;
            // console.log("sendMove(move)", move);
            this.doSend({ type: "move", gameId: this.model["gameId"], move: move });
        };
        this.onMove = () => {
            return (orig, dest, capturedPiece) => {
                console.log("   ground.onMove()", orig, dest, capturedPiece);
                if (this.variant === "shogi") {
                    sound_1.sound.shogimove();
                }
                else {
                    if (capturedPiece) {
                        sound_1.sound.capture();
                    }
                    else {
                        sound_1.sound.move();
                    }
                }
            };
        };
        this.onDrop = () => {
            return (piece, dest) => {
                console.log("ground.onDrop()", piece, dest);
                if (dest != 'z0' && piece.role && pocket_1.dropIsValid(this.dests, piece.role, dest)) {
                    if (this.variant === "shogi") {
                        sound_1.sound.shogimove();
                    }
                    else {
                        sound_1.sound.move();
                    }
                }
                else {
                    this.clickDrop = piece;
                }
            };
        };
        this.onUserMove = (orig, dest, meta) => {
            // chessground doesn't knows about ep, so we have to remove ep captured pawn
            const pieces = this.chessground.state.pieces;
            const geom = this.chessground.state.geometry;
            // console.log("ground.onUserMove()", orig, dest, meta, pieces);
            const moved = pieces[dest];
            const firstRankIs0 = this.chessground.state.dimensions.height === 10;
            if (meta.captured === undefined && moved.role === "pawn" && orig[0] != dest[0] && chess_1.hasEp(this.variant)) {
                const pos = util_1.key2pos(dest, firstRankIs0), pawnPos = [pos[0], pos[1] + (this.mycolor === 'white' ? -1 : 1)];
                const diff = {};
                diff[util_1.pos2key(pawnPos, geom)] = undefined;
                this.chessground.setPieces(diff);
                meta.captured = { role: "pawn" };
            }
            ;
            // increase pocket count
            if ((this.variant === "crazyhouse" || this.variant === "capahouse" || this.variant === "shouse" || this.variant === "grandhouse" || this.variant === "shogi") && meta.captured) {
                var role = meta.captured.role;
                if (meta.captured.promoted)
                    role = this.variant === "shogi" ? meta.captured.role.slice(1) : "pawn";
                if (this.flip) {
                    this.pockets[0][role]++;
                    this.vpocket0 = patch(this.vpocket0, pocket_1.pocketView(this, this.mycolor, "top"));
                }
                else {
                    this.pockets[1][role]++;
                    this.vpocket1 = patch(this.vpocket1, pocket_1.pocketView(this, this.mycolor, "bottom"));
                }
            }
            ;
            //  gating elephant/hawk
            if (this.variant === "seirawan" || this.variant === "shouse") {
                if (!this.promotion.start(orig, dest, meta) && !this.gating.start(this.fullfen, orig, dest, meta))
                    this.sendMove(orig, dest, '');
            }
            else {
                if (!this.promotion.start(orig, dest, meta))
                    this.sendMove(orig, dest, '');
            }
            ;
        };
        this.onUserDrop = (role, dest) => {
            // console.log("ground.onUserDrop()", role, dest);
            // decrease pocket count
            //cancelDropMode(this.chessground.state);
            if (pocket_1.dropIsValid(this.dests, role, dest)) {
                if (this.flip) {
                    this.pockets[0][role]--;
                    this.vpocket0 = patch(this.vpocket0, pocket_1.pocketView(this, this.mycolor, "top"));
                }
                else {
                    this.pockets[1][role]--;
                    this.vpocket1 = patch(this.vpocket1, pocket_1.pocketView(this, this.mycolor, "bottom"));
                }
                this.sendMove(chess_1.roleToSan[role] + "@", dest, '');
                // console.log("sent move", move);
            }
            else {
                console.log("!!! invalid move !!!", role, dest);
                // restore board
                this.clickDrop = undefined;
                this.chessground.set({
                    fen: this.fullfen,
                    lastMove: this.lastmove,
                    turnColor: this.mycolor,
                    movable: {
                        dests: this.dests,
                        showDests: true,
                    },
                });
            }
        };
        this.onSelect = (selected) => {
            return (key) => {
                console.log("ground.onSelect()", key, selected, this.clickDrop, this.chessground.state);
                // If drop selection was set dropDests we have to restore dests here
                if (this.chessground.state.movable.dests === undefined)
                    return;
                if (key != 'z0' && 'z0' in this.chessground.state.movable.dests) {
                    if (this.clickDrop !== undefined && pocket_1.dropIsValid(this.dests, this.clickDrop.role, key)) {
                        this.chessground.newPiece(this.clickDrop, key);
                        this.onUserDrop(this.clickDrop.role, key);
                    }
                    this.clickDrop = undefined;
                    //cancelDropMode(this.chessground.state);
                    this.chessground.set({ movable: { dests: this.dests } });
                }
                ;
                // Sittuyin in place promotion on Ctrl+click
                if (this.chessground.state.stats.ctrlKey &&
                    (key in this.chessground.state.movable.dests) &&
                    (this.chessground.state.movable.dests[key].indexOf(key) >= 0) &&
                    (this.variant === 'sittuyin')) {
                    console.log("Ctrl in place promotion", key);
                    var pieces = {};
                    var piece = this.chessground.state.pieces[key];
                    pieces[key] = {
                        color: piece.color,
                        role: 'ferz',
                        promoted: true
                    };
                    this.chessground.setPieces(pieces);
                    this.sendMove(key, key, 'f');
                }
                ;
            };
        };
        this.onMsgUserConnected = () => {
            // we want to know lastMove and check status
            this.doSend({ type: "board", gameId: this.model["gameId"] });
        };
        this.onMsgChat = (msg) => {
            if (msg.user !== this.model["username"])
                chat_1.chatMessage(msg.user, msg.message, "roundchat");
        };
        this.onMessage = (evt) => {
            console.log("<+++ onMessage():", evt.data);
            var msg = JSON.parse(evt.data);
            switch (msg.type) {
                case "board":
                    this.onMsgBoard(msg);
                    break;
                case "game_user_connected":
                    this.onMsgUserConnected();
                    break;
                case "roundchat":
                    this.onMsgChat(msg);
                    break;
            }
        };
        const onOpen = (evt) => {
            console.log("ctrl.onOpen()", evt);
            this.doSend({ type: "game_user_connected", username: this.model["username"], gameId: this.model["gameId"] });
        };
        const opts = {
            maxAttempts: 10,
            onopen: e => onOpen(e),
            onmessage: e => this.onMessage(e),
            onreconnect: e => console.log('Reconnecting in round...', e),
            onmaximum: e => console.log('Stop Attempting!', e),
            onclose: e => console.log('Closed!', e),
            onerror: e => console.log('Error:', e),
        };
        try {
            this.sock = new sockette_1.default("ws://" + location.host + "/wsr", opts);
        }
        catch (err) {
            this.sock = new sockette_1.default("wss://" + location.host + "/wsr", opts);
        }
        this.model = model;
        this.variant = model["variant"];
        this.fullfen = model["fen"];
        this.wplayer = model["wplayer"];
        this.bplayer = model["bplayer"];
        this.base = model["base"];
        this.inc = model["inc"];
        this.status = model["status"];
        this.steps = [];
        this.pgn = "";
        this.ply = 0;
        this.flip = false;
        this.settings = true;
        this.CSSindexesB = chess_1.variants.map((variant) => localStorage[variant + "_board"] === undefined ? 0 : Number(localStorage[variant + "_board"]));
        this.CSSindexesP = chess_1.variants.map((variant) => localStorage[variant + "_pieces"] === undefined ? 0 : Number(localStorage[variant + "_pieces"]));
        this.spectator = this.model["username"] !== this.wplayer && this.model["username"] !== this.bplayer;
        // orientation = this.mycolor
        if (this.spectator) {
            this.mycolor = this.variant === 'shogi' ? 'black' : 'white';
            this.oppcolor = this.variant === 'shogi' ? 'white' : 'black';
        }
        else {
            this.mycolor = this.model["username"] === this.wplayer ? 'white' : 'black';
            this.oppcolor = this.model["username"] === this.wplayer ? 'black' : 'white';
        }
        // players[0] is top player, players[1] is bottom player
        this.players = [
            this.mycolor === "white" ? this.bplayer : this.wplayer,
            this.mycolor === "white" ? this.wplayer : this.bplayer
        ];
        this.titles = [
            this.mycolor === "white" ? this.model['btitle'] : this.model['wtitle'],
            this.mycolor === "white" ? this.model['wtitle'] : this.model['btitle']
        ];
        this.result = "";
        const parts = this.fullfen.split(" ");
        const fen_placement = parts[0];
        this.turnColor = parts[1] === "w" ? "white" : "black";
        this.steps.push({
            'fen': fen_placement,
            'move': undefined,
            'check': false,
            'turnColor': this.turnColor,
        });
        this.chessground = chessgroundx_1.Chessground(el, {
            fen: fen_placement,
            geometry: chess_1.VARIANTS[this.variant].geom,
            orientation: this.mycolor,
            turnColor: this.turnColor,
            animation: {
                enabled: true,
            },
            events: {
                insert(elements) { resize_1.default(elements); }
            }
        });
        if (this.spectator) {
            this.chessground.set({
                viewOnly: true,
                events: {
                    move: this.onMove(),
                }
            });
        }
        else {
            this.chessground.set({
                movable: {
                    free: false,
                    color: this.mycolor,
                    showDests: true,
                    events: {
                        after: this.onUserMove,
                        afterNewPiece: this.onUserDrop,
                    }
                },
                events: {
                    move: this.onMove(),
                    dropNewPiece: this.onDrop(),
                    select: this.onSelect(this.chessground.state.selected),
                }
            });
        }
        ;
        this.gating = gating_1.default(this);
        this.promotion = promotion_1.default(this);
        // initialize pockets
        if (chess_1.needPockets(this.variant)) {
            const pocket0 = document.getElementById('pocket0');
            const pocket1 = document.getElementById('pocket1');
            pocket_1.updatePockets(this, pocket0, pocket1);
        }
        patch(document.getElementById('board-settings'), settings_1.settingsView(this));
        patch(document.getElementById('movelist'), movelist_1.movelistView(this));
        patch(document.getElementById('roundchat'), chat_1.chatView(this, "roundchat"));
    }
}
exports.default = AnalysisController;

},{"./chat":34,"./chess":35,"./gating":37,"./movelist":40,"./pocket":43,"./profile":44,"./promotion":45,"./resize":46,"./settings":49,"./sound":50,"chessgroundx":4,"chessgroundx/util":17,"snabbdom":26,"snabbdom/h":19,"snabbdom/modules/attributes":22,"snabbdom/modules/class":23,"snabbdom/modules/eventlisteners":24,"snabbdom/modules/props":25,"sockette":30}],34:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const class_1 = __importDefault(require("snabbdom/modules/class"));
const attributes_1 = __importDefault(require("snabbdom/modules/attributes"));
const props_1 = __importDefault(require("snabbdom/modules/props"));
const eventlisteners_1 = __importDefault(require("snabbdom/modules/eventlisteners"));
const patch = snabbdom_1.init([class_1.default, attributes_1.default, props_1.default, eventlisteners_1.default]);
const h_1 = __importDefault(require("snabbdom/h"));
function chatView(ctrl, chatType) {
    function onKeyPress(e) {
        const message = e.target.value;
        if ((e.keyCode == 13 || e.which == 13) && message.length > 0) {
            chatMessage(ctrl.model['username'], message, chatType);
            ctrl.sock.send(JSON.stringify({ "type": chatType, "message": message, "gameId": ctrl.model["gameId"] }));
            e.target.value = "";
        }
    }
    return h_1.default(`div.${chatType}#${chatType}`, { class: { "chat": true } }, [
        h_1.default(`ol#${chatType}-messages`, [h_1.default("div#messages")]),
        h_1.default('input#chat-entry', {
            props: {
                type: "text",
                name: "entry",
                autocomplete: "off",
                placeholder: "Please be nice in the chat!",
                maxlength: "140",
            },
            on: { keypress: (e) => onKeyPress(e) },
        })
    ]);
}
exports.chatView = chatView;
function chatMessage(user, message, chatType) {
    const myDiv = document.getElementById(chatType + '-messages');
    // You must add border widths, padding and margins to the right.
    const isScrolled = myDiv.scrollTop == myDiv.scrollHeight - myDiv.offsetHeight;
    var container = document.getElementById('messages');
    if (user.length === 0) {
        patch(container, h_1.default('div#messages', [h_1.default("li.message.offer", [h_1.default("t", message)])]));
    }
    else if (user === '_server') {
        patch(container, h_1.default('div#messages', [h_1.default("li.message.server", [h_1.default("user", 'Server'), h_1.default("t", message)])]));
    }
    else {
        patch(container, h_1.default('div#messages', [h_1.default("li.message", [h_1.default("user", user), h_1.default("t", message)])]));
    }
    ;
    if (isScrolled)
        myDiv.scrollTop = myDiv.scrollHeight;
}
exports.chatMessage = chatMessage;

},{"snabbdom":26,"snabbdom/h":19,"snabbdom/modules/attributes":22,"snabbdom/modules/class":23,"snabbdom/modules/eventlisteners":24,"snabbdom/modules/props":25}],35:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("chessgroundx/util");
exports.variants = ["makruk", "sittuyin", "placement", "crazyhouse", "standard", "shogi", "xiangqi", "capablanca", "seirawan", "capahouse", "shouse", "grand", "grandhouse"];
exports.variants960 = ["crazyhouse", "standard", "capablanca", "capahouse"];
exports.VARIANTS = {
    makruk: { geom: 0 /* dim8x8 */, cg: "cg-512", board: "grid", BoardCSS: ["makrb1", "makrb2"], pieces: "makruk", PieceCSS: ["makruk"], icon: "Q" },
    sittuyin: { geom: 0 /* dim8x8 */, cg: "cg-512", board: "gridx", BoardCSS: ["sittb1", "sittb2"], pieces: "sittuyin", PieceCSS: ["sittuyinm", "sittuyins"], icon: "R" },
    shogi: { geom: 1 /* dim9x9 */, cg: "cg-576", board: "grid9x9", BoardCSS: ["9x9a", "9x9b", "9x9c", "9x9d", "9x9e", "9x9f"], pieces: "shogi", PieceCSS: ["shogi0k", "shogi0", "shogi0w", "shogi0p"], icon: "K" },
    xiangqi: { geom: 3 /* dim9x10 */, cg: "cg-576-640", board: "river", BoardCSS: ["9x10a", "9x10b", "9x10c", "9x10d", "9x10e"], pieces: "xiangqi", PieceCSS: ["xiangqi", "xiangqie", "xiangqict2", "xiangqihnz"], icon: "O" },
    placement: { geom: 0 /* dim8x8 */, cg: "cg-512", board: "board8x8", BoardCSS: ["8x8brown", "8x8blue", "8x8green", "8x8maple", "8x8olive"], pieces: "standard", PieceCSS: ["standard", "green", "alpha"], icon: "S" },
    crazyhouse: { geom: 0 /* dim8x8 */, cg: "cg-512", board: "board8x8", BoardCSS: ["8x8brown", "8x8blue", "8x8green", "8x8maple", "8x8olive"], pieces: "standard", PieceCSS: ["standard", "green", "alpha"], icon: "H" },
    capablanca: { geom: 2 /* dim10x8 */, cg: "cg-640", board: "board10x8", BoardCSS: ["10x8brown", "10x8blue", "10x8green", "10x8maple", "10x8olive"], pieces: "capa", PieceCSS: ["capa0", "capa1", "capa2", "capa3"], icon: "P" },
    capahouse: { geom: 2 /* dim10x8 */, cg: "cg-640", board: "board10x8", BoardCSS: ["10x8brown", "10x8blue", "10x8green", "10x8maple", "10x8olive"], pieces: "capa", PieceCSS: ["capa0", "capa1", "capa2", "capa3"], icon: "P" },
    grand: { geom: 4 /* dim10x10 */, cg: "cg-640-640", board: "board10x10", BoardCSS: ["10x10brown", "10x10blue", "10x10green", "10x10maple", "10x10olive"], pieces: "capa", PieceCSS: ["capa0", "capa1", "capa2", "capa3"], icon: "G" },
    grandhouse: { geom: 4 /* dim10x10 */, cg: "cg-640-640", board: "board10x10", BoardCSS: ["10x10brown", "10x10blue", "10x10green", "10x10maple", "10x10olive"], pieces: "capa", PieceCSS: ["capa0", "capa1", "capa2", "capa3"], icon: "G" },
    seirawan: { geom: 0 /* dim8x8 */, cg: "cg-512", board: "board8x8", BoardCSS: ["8x8brown", "8x8blue", "8x8green", "8x8maple", "8x8olive"], pieces: "seirawan", PieceCSS: ["seir1", "seir0", "seir2", "seir3"], icon: "L" },
    shouse: { geom: 0 /* dim8x8 */, cg: "cg-512", board: "board8x8", BoardCSS: ["8x8brown", "8x8blue", "8x8green", "8x8maple", "8x8olive"], pieces: "seirawan", PieceCSS: ["seir1", "seir0", "seir2", "seir3"], icon: "L" },
    standard: { geom: 0 /* dim8x8 */, cg: "cg-512", board: "board8x8", BoardCSS: ["8x8brown", "8x8blue", "8x8green", "8x8maple", "8x8olive"], pieces: "standard", PieceCSS: ["standard", "green", "alpha"], icon: "M" },
};
function pocketRoles(variant) {
    switch (variant) {
        case "sittuyin":
            return ["rook", "knight", "silver", "ferz", "king"];
        case "crazyhouse":
            return ["pawn", "knight", "bishop", "rook", "queen"];
        case "grandhouse":
        case "capahouse":
            return ["pawn", "knight", "bishop", "rook", "queen", "archbishop", "cancellor"];
        case "shogi":
            return ["pawn", "lance", "knight", "bishop", "rook", "silver", "gold"];
        case "shouse":
            return ["pawn", "knight", "bishop", "rook", "queen", "elephant", "hawk"];
        case "seirawan":
            return ["elephant", "hawk"];
        default:
            return ["rook", "knight", "bishop", "queen", "king"];
    }
}
exports.pocketRoles = pocketRoles;
function promotionZone(variant, color) {
    switch (variant) {
        case 'shogi':
            return color === 'white' ? 'a9b9c9d9e9f9g9h9i9a8b8c8d8e8f8g8h8i8a7b7c7d7e7f7g7h7i7' : 'a1b1c1d1e1f1g1h1i1a2b2c2d2e2f2g2h2i2a3b3c3d3e3f3g3h3i3';
        case 'makruk':
            return color === 'white' ? 'a6b6c6d6e6f6g6h6' : 'a3b3c3d3e3f3g3h3';
        case 'sittuyin':
            return color === 'white' ? 'a8b7c6d5e5f6g7h8' : 'a1b2c3d4e4f3g2h1';
        default:
            return color === 'white' ? 'a8b8c8d8e8f8g8h8i8j8' : 'a1b1c1d1e1f1g1h1i1j1';
    }
}
function promotionRoles(variant, role, orig, dest, promotions) {
    switch (variant) {
        case "capahouse":
        case "capablanca":
            return ["queen", "knight", "rook", "bishop", "archbishop", "cancellor"];
        case "shouse":
        case "seirawan":
            return ["queen", "knight", "rook", "bishop", "elephant", "hawk"];
        case "shogi":
            return ["p" + role, role];
        case "grandhouse":
        case "grand":
            var roles = [];
            const moves = promotions.map((move) => move.slice(0, -1));
            promotions.forEach((move) => {
                const prole = exports.sanToRole[move.slice(-1)];
                if (moves.indexOf(orig + dest) !== -1 && roles.indexOf(prole) === -1) {
                    roles.push(prole);
                }
            });
            // promotion is optional except on back ranks
            if ((dest[1] !== "9") && (dest[1] !== "0"))
                roles.push(role);
            return roles;
        default:
            return ["queen", "knight", "rook", "bishop"];
    }
}
exports.promotionRoles = promotionRoles;
function mandatoryPromotion(role, dest, color) {
    switch (role) {
        case "pawn":
        case "lance":
            if (color === "white") {
                return dest[1] === "9";
            }
            else {
                return dest[1] === "1";
            }
        case "knight":
            if (color === "white") {
                return dest[1] === "9" || dest[1] === "8";
            }
            else {
                return dest[1] === "1" || dest[1] === "2";
            }
        default:
            return false;
    }
}
exports.mandatoryPromotion = mandatoryPromotion;
function needPockets(variant) {
    return variant === 'placement' || variant === 'crazyhouse' || variant === 'sittuyin' || variant === 'shogi' || variant === 'seirawan' || variant === 'capahouse' || variant === 'shouse' || variant === 'grandhouse';
}
exports.needPockets = needPockets;
function hasEp(variant) {
    return variant === 'standard' || variant === 'placement' || variant === 'crazyhouse' || variant === 'capablanca' || variant === 'seirawan' || variant === 'capahouse' || variant === 'shouse' || variant === 'grand' || variant === 'grandhouse';
}
exports.hasEp = hasEp;
function diff(a, b) {
    return Math.abs(a - b);
}
function diagonalMove(pos1, pos2) {
    const xd = diff(pos1[0], pos2[0]);
    const yd = diff(pos1[1], pos2[1]);
    return xd === yd && xd === 1;
}
function canGate(fen, piece, orig, dest, meta) {
    console.log("   isGating()", fen, piece, orig, dest, meta);
    const no_gate = [false, false, false, false, false, false];
    if ((piece.color === "white" && orig.slice(1) !== "1") ||
        (piece.color === "black" && orig.slice(1) !== "8") ||
        (piece.role === "hawk") ||
        (piece.role === "elephant"))
        return no_gate;
    // In starting position king and(!) rook virginity is encoded in KQkq
    // "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[HEhe] w KQBCDFGkqbcdfg - 0 1"
    // but after kings moved rook virginity is encoded in AHah
    // rnbq1bnr/ppppkppp/8/4p3/4P3/8/PPPPKPPP/RNBQ1BNR[HEhe] w ABCDFGHabcdfgh - 2 3
    // king virginity is encoded in Ee after any Rook moved but King not
    const parts = fen.split(" ");
    const placement = parts[0];
    const color = parts[1];
    const castl = parts[2];
    // console.log("isGating()", orig, placement, color, castl);
    switch (orig) {
        case "a1":
            if (castl.indexOf("A") === -1 && castl.indexOf("Q") === -1)
                return no_gate;
            break;
        case "b1":
            if (castl.indexOf("B") === -1)
                return no_gate;
            break;
        case "c1":
            if (castl.indexOf("C") === -1)
                return no_gate;
            break;
        case "d1":
            if (castl.indexOf("D") === -1)
                return no_gate;
            break;
        case "e1":
            if (piece.role !== "king") {
                return no_gate;
            }
            else if ((castl.indexOf("K") === -1) && (castl.indexOf("Q") === -1)) {
                return no_gate;
            }
            else if (castl.indexOf("E") === -1) {
                return no_gate;
            }
            ;
            break;
        case "f1":
            if (castl.indexOf("F") === -1)
                return no_gate;
            break;
        case "g1":
            if (castl.indexOf("G") === -1)
                return no_gate;
            break;
        case "h1":
            if (castl.indexOf("H") === -1 && castl.indexOf("K") === -1)
                return no_gate;
            break;
        case "a8":
            if (castl.indexOf("a") === -1 && castl.indexOf("q") === -1)
                return no_gate;
            break;
        case "b8":
            if (castl.indexOf("b") === -1)
                return no_gate;
            break;
        case "c8":
            if (castl.indexOf("c") === -1)
                return no_gate;
            break;
        case "d8":
            if (castl.indexOf("d") === -1)
                return no_gate;
            break;
        case "e8":
            if (piece.role !== "king") {
                return no_gate;
            }
            else if ((castl.indexOf("k") === -1) && (castl.indexOf("q") === -1)) {
                return no_gate;
            }
            else if (castl.indexOf("e") === -1) {
                return no_gate;
            }
            ;
            break;
        case "f8":
            if (castl.indexOf("f") === -1)
                return no_gate;
            break;
        case "g8":
            if (castl.indexOf("g") === -1)
                return no_gate;
            break;
        case "h8":
            if (castl.indexOf("h") === -1 && castl.indexOf("k") === -1)
                return no_gate;
            break;
    }
    ;
    const bracketPos = placement.indexOf("[");
    const pockets = placement.slice(bracketPos);
    const ph = lc(pockets, "h", color === 'w') !== 0;
    const pe = lc(pockets, "e", color === 'w') !== 0;
    const pq = lc(pockets, "q", color === 'w') !== 0;
    const pr = lc(pockets, "r", color === 'w') !== 0;
    const pb = lc(pockets, "b", color === 'w') !== 0;
    const pn = lc(pockets, "n", color === 'w') !== 0;
    return [ph, pe, pq, pr, pb, pn];
}
exports.canGate = canGate;
function isPromotion(variant, piece, orig, dest, meta, promotions) {
    if (variant === 'xiangqi')
        return false;
    const pz = promotionZone(variant, piece.color);
    switch (variant) {
        case 'shogi':
            return ['king', 'gold', 'ppawn', 'pknight', 'pbishop', 'prook', 'psilver', 'plance'].indexOf(piece.role) === -1
                && (pz.indexOf(orig) !== -1 || pz.indexOf(dest) !== -1);
        case 'sittuyin':
            // See https://vdocuments.net/how-to-play-myanmar-traditional-chess-eng-book-1.html
            const firstRankIs0 = false;
            const dm = diagonalMove(util_1.key2pos(orig, firstRankIs0), util_1.key2pos(dest, firstRankIs0));
            return piece.role === "pawn" && (orig === dest || (!meta.captured && dm));
        case 'grandhouse':
        case 'grand':
            // TODO: we can use this for other variants also
            return promotions.map((move) => move.slice(0, -1)).indexOf(orig + dest) !== -1;
        default:
            return piece.role === "pawn" && pz.indexOf(dest) !== -1;
    }
}
exports.isPromotion = isPromotion;
function uci2usi(move) {
    const parts = move.split("");
    if (parts[1] === "@") {
        parts[1] = "*";
        parts[2] = String.fromCharCode(parts[2].charCodeAt() - 48);
        parts[3] = String.fromCharCode(parts[3].charCodeAt() + 48);
    }
    else {
        parts[0] = String.fromCharCode(parts[0].charCodeAt() - 48);
        parts[1] = String.fromCharCode(parts[1].charCodeAt() + 48);
        parts[2] = String.fromCharCode(parts[2].charCodeAt() - 48);
        parts[3] = String.fromCharCode(parts[3].charCodeAt() + 48);
    }
    return parts.join("");
}
exports.uci2usi = uci2usi;
function usi2uci(move) {
    console.log("usi2uci()", move);
    const parts = move.split("");
    if (parts[1] === "*") {
        parts[1] = "@";
        parts[2] = String.fromCharCode(parts[2].charCodeAt() + 48);
        parts[3] = String.fromCharCode(parts[3].charCodeAt() - 48);
    }
    else {
        parts[0] = String.fromCharCode(parts[0].charCodeAt() + 48);
        parts[1] = String.fromCharCode(parts[1].charCodeAt() - 48);
        parts[2] = String.fromCharCode(parts[2].charCodeAt() + 48);
        parts[3] = String.fromCharCode(parts[3].charCodeAt() - 48);
    }
    return parts.join("");
}
exports.usi2uci = usi2uci;
function zero2grand(move) {
    const parts = move.split("");
    if (parts[1] !== "@") {
        parts[1] = String(Number(parts[1]) + 1);
    }
    parts[3] = String(Number(parts[3]) + 1);
    return parts.join("");
}
exports.zero2grand = zero2grand;
function grand2zero(move) {
    // cut off promotion piece letter
    var promo = '';
    if ('0123456789'.indexOf(move.slice(-1)) === -1) {
        promo = move.slice(-1);
        move = move.slice(0, -1);
    }
    const parts = move.split("");
    if (parts[1] === '@') {
        return parts[0] + parts[1] + parts[2] + String(Number(move.slice(3)) - 1);
    }
    if ('0123456789'.indexOf(parts[2]) !== -1) {
        parts[1] = String(Number(parts[1] + parts[2]) - 1);
        parts[4] = String(Number(move.slice(4)) - 1);
        return parts[0] + parts[1] + parts[3] + parts[4] + promo;
    }
    else {
        parts[1] = String(Number(parts[1]) - 1);
        parts[3] = String(Number(move.slice(3)) - 1);
        return parts[0] + parts[1] + parts[2] + parts[3] + promo;
    }
}
exports.grand2zero = grand2zero;
exports.roleToSan = {
    pawn: 'P',
    knight: 'N',
    bishop: 'B',
    rook: 'R',
    queen: 'Q',
    king: 'K',
    archbishop: 'A',
    cancellor: 'C',
    elephant: "E",
    hawk: "H",
    ferz: 'F',
    met: 'M',
    gold: 'G',
    silver: 'S',
    lance: 'L',
};
exports.sanToRole = {
    P: 'pawn',
    N: 'knight',
    B: 'bishop',
    R: 'rook',
    Q: 'queen',
    K: 'king',
    A: 'archbishop',
    C: 'cancellor',
    E: 'elephant',
    H: 'hawk',
    F: 'ferz',
    M: 'met',
    G: 'gold',
    S: 'silver',
    L: 'lance',
    p: 'pawn',
    n: 'knight',
    b: 'bishop',
    r: 'rook',
    q: 'queen',
    k: 'king',
    a: 'archbishop',
    c: 'cancellor',
    e: 'elephant',
    h: 'hawk',
    f: 'ferz',
    m: 'met',
    g: 'gold',
    s: 'silver',
    l: 'lance',
};
// Count given letter occurences in a string
function lc(str, letter, uppercase) {
    var letterCount = 0;
    if (uppercase)
        letter = letter.toUpperCase();
    for (var position = 0; position < str.length; position++) {
        if (str.charAt(position) === letter)
            letterCount += 1;
    }
    return letterCount;
}
exports.lc = lc;

},{"chessgroundx/util":17}],36:[function(require,module,exports){
"use strict";
// https://stackoverflow.com/questions/20618355/the-simplest-possible-javascript-countdown-timer
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const class_1 = __importDefault(require("snabbdom/modules/class"));
const attributes_1 = __importDefault(require("snabbdom/modules/attributes"));
const props_1 = __importDefault(require("snabbdom/modules/props"));
const eventlisteners_1 = __importDefault(require("snabbdom/modules/eventlisteners"));
const patch = snabbdom_1.init([class_1.default, attributes_1.default, props_1.default, eventlisteners_1.default]);
class Clock {
    // game baseTime (min) and increment (sec)
    constructor(baseTime, increment, el, id) {
        this.start = (duration) => {
            if (this.running)
                return;
            if (typeof duration !== "undefined")
                this.duration = duration;
            this.running = true;
            this.startTime = Date.now();
            var that = this;
            var diff;
            (function timer() {
                diff = that.duration - (Date.now() - that.startTime);
                // console.log("timer()", that.duration, that.startTime, diff);
                if (diff <= 0) {
                    that.flagCallback();
                    that.pause(false);
                    return;
                }
                that.timeout = setTimeout(timer, that.granularity);
                that.tickCallbacks.forEach(function (callback) {
                    callback.call(that, that, diff);
                }, that);
            }());
        };
        this.onTick = (callback) => {
            if (typeof callback === 'function') {
                this.tickCallbacks.push(callback);
            }
            return this;
        };
        this.onFlag = (callback) => {
            if (typeof callback === 'function') {
                this.pause(false);
                this.flagCallback = callback;
            }
            return this;
        };
        this.pause = (withIncrement) => {
            if (!this.running)
                return;
            this.running = false;
            if (this.timeout)
                clearTimeout(this.timeout);
            this.timeout = null;
            this.duration -= Date.now() - this.startTime;
            if (withIncrement && this.increment)
                this.duration += this.increment;
            renderTime(this, this.duration);
        };
        this.setTime = (millis) => {
            this.duration = millis;
            renderTime(this, this.duration);
        };
        this.parseTime = (millis) => {
            let minutes = Math.floor(millis / 60000);
            let seconds = (millis % 60000) / 1000;
            let secs, mins;
            if (Math.floor(seconds) == 60) {
                minutes++;
                seconds = 0;
            }
            minutes = Math.max(0, minutes);
            seconds = Math.max(0, seconds);
            if (millis < 10000) {
                secs = seconds.toFixed(1);
            }
            else {
                secs = String(Math.floor(seconds));
            }
            mins = (minutes < 10 ? "0" : "") + String(minutes);
            secs = (seconds < 10 ? "0" : "") + secs;
            return {
                minutes: mins,
                seconds: secs,
            };
        };
        this.duration = baseTime * 1000 * 60;
        this.increment = increment * 1000;
        this.granularity = 500;
        this.running = false;
        this.connecting = false;
        this.timeout = null;
        this.startTime = null;
        this.tickCallbacks = [];
        this.flagCallback = null;
        this.el = el;
        this.id = id;
        renderTime(this, this.duration);
    }
}
exports.Clock = Clock;
function renderTime(clock, time) {
    if (clock.granularity > 100 && time < 10000)
        clock.granularity = 100;
    const parsed = clock.parseTime(time);
    // console.log("renderTime():", time, parsed);
    const date = new Date(time);
    const millis = date.getUTCMilliseconds();
    clock.el = patch(clock.el, snabbdom_1.h('div.clock-wrap#' + clock.id, [
        snabbdom_1.h('div.clock', [
            snabbdom_1.h('div.clock.time.min', { class: { running: clock.running, hurry: time < 10000, connecting: clock.connecting } }, parsed.minutes),
            snabbdom_1.h('div.clock.sep', { class: { running: clock.running, hurry: time < 10000, low: millis < 500, connecting: clock.connecting } }, ':'),
            snabbdom_1.h('div.clock.time.sec', { class: { running: clock.running, hurry: time < 10000, connecting: clock.connecting } }, parsed.seconds)
        ])
    ]));
}
exports.renderTime = renderTime;
function timeago(date) {
    const TZdate = new Date(date + 'Z');
    var val = 0 | (Date.now() - TZdate.getTime()) / 1000;
    var unit, length = { second: 60, minute: 60, hour: 24, day: 7, week: 4.35,
        month: 12, year: 10000 }, result;
    for (unit in length) {
        result = val % length[unit];
        if (!(val = 0 | val / length[unit]))
            return result + ' ' + (result - 1 ? unit + 's' : unit) + ' ago';
    }
    return '';
}
exports.timeago = timeago;
function renderTimeago() {
    var x = document.getElementsByTagName("info-date");
    var i;
    for (i = 0; i < x.length; i++) {
        x[i].innerHTML = timeago(x[i].getAttribute('timestamp'));
    }
    setTimeout(renderTimeago, 1200);
}
exports.renderTimeago = renderTimeago;

},{"snabbdom":26,"snabbdom/modules/attributes":22,"snabbdom/modules/class":23,"snabbdom/modules/eventlisteners":24,"snabbdom/modules/props":25}],37:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const class_1 = __importDefault(require("snabbdom/modules/class"));
const attributes_1 = __importDefault(require("snabbdom/modules/attributes"));
const eventlisteners_1 = __importDefault(require("snabbdom/modules/eventlisteners"));
const tovnode_1 = __importDefault(require("snabbdom/tovnode"));
const util_1 = require("chessgroundx/util");
const chess_1 = require("./chess");
const pocket_1 = require("./pocket");
const patch = snabbdom_1.init([class_1.default, attributes_1.default, eventlisteners_1.default]);
function default_1(ctrl) {
    let gating = false;
    let roles = [];
    function start(fen, orig, dest, meta) {
        const ground = ctrl.getGround();
        const gatable = chess_1.canGate(fen, ground.state.pieces[dest], orig, dest, meta);
        roles = ["hawk", "elephant", "queen", "rook", "bishop", "knight", ""];
        if (gatable[0] || gatable[1] || gatable[2] || gatable[3] || gatable[4] || gatable[5]) {
            const color = ctrl.mycolor;
            const orientation = ground.state.orientation;
            if (roles.indexOf("hawk") !== -1 && !gatable[0])
                roles.splice(roles.indexOf("hawk"), 1);
            if (roles.indexOf("elephant") !== -1 && !gatable[1])
                roles.splice(roles.indexOf("elephant"), 1);
            if (roles.indexOf("queen") !== -1 && !gatable[2])
                roles.splice(roles.indexOf("queen"), 1);
            if (roles.indexOf("rook") !== -1 && !gatable[3])
                roles.splice(roles.indexOf("rook"), 1);
            if (roles.indexOf("bishop") !== -1 && !gatable[4])
                roles.splice(roles.indexOf("bishop"), 1);
            if (roles.indexOf("knight") !== -1 && !gatable[5])
                roles.splice(roles.indexOf("knight"), 1);
            var origs = [orig];
            const castling = ground.state.pieces[dest].role === "king" && orig[0] === "e" && dest[0] !== "d" && dest[0] !== "e" && dest[0] !== "f";
            var rookDest = "";
            if (castling) {
                // O-O
                if (dest[0] > "e") {
                    origs.push("h" + orig[1]);
                    rookDest = "e" + orig[1];
                    // O-O-O
                }
                else {
                    origs.push("a" + orig[1]);
                    rookDest = "e" + orig[1];
                }
                ;
            }
            ;
            draw_gating(origs, color, orientation);
            gating = {
                origs: origs,
                dest: dest,
                rookDest: rookDest,
                callback: ctrl.sendMove,
            };
            return true;
        }
        return false;
    }
    ;
    function gate(ctrl, orig, dest, role) {
        const g = ctrl.getGround();
        const color = g.state.pieces[dest].color;
        g.newPiece({ "role": role, "color": color }, orig);
        ctrl.pockets[color === 'white' ? 0 : 1][role]--;
        ctrl.vpocket1 = patch(ctrl.vpocket1, pocket_1.pocketView(ctrl, color, "bottom"));
    }
    function draw_gating(origs, color, orientation) {
        var container = tovnode_1.default(document.querySelector('extension'));
        patch(container, renderGating(origs, color, orientation));
    }
    function draw_no_gating() {
        var container = document.getElementById('extension_choice');
        patch(container, snabbdom_1.h('extension'));
    }
    function finish(role, index) {
        if (gating) {
            draw_no_gating();
            if (role)
                gate(ctrl, gating.origs[index], gating.dest, role);
            else
                index = 0;
            const gated = role ? chess_1.roleToSan[role].toLowerCase() : "";
            if (gating.callback)
                gating.callback(gating.origs[index], index === 0 ? gating.dest : gating.rookDest, gated);
            gating = false;
        }
    }
    ;
    function cancel() {
        draw_no_gating();
        ctrl.goPly(ctrl.ply);
        return;
    }
    function bind(eventName, f, redraw) {
        return {
            insert(vnode) {
                vnode.elm.addEventListener(eventName, e => {
                    const res = f(e);
                    if (redraw)
                        redraw();
                    return res;
                });
            }
        };
    }
    function renderSquares(orig, color, orientation, index) {
        const firstRankIs0 = false;
        var left = (8 - util_1.key2pos(orig, firstRankIs0)[0]) * 12.5;
        if (orientation === "white")
            left = 87.5 - left;
        return roles.map((serverRole, i) => {
            var top = (color === orientation ? 7 - i : i) * 12.5;
            return snabbdom_1.h("square", {
                attrs: { style: "top: " + top + "%;left: " + left + "%" },
                hook: bind("click", e => {
                    e.stopPropagation();
                    finish(serverRole, index);
                }, false)
            }, [snabbdom_1.h("piece." + serverRole + "." + color)]);
        });
    }
    function renderGating(origs, color, orientation) {
        var vertical = color === orientation ? "top" : "bottom";
        var squares = renderSquares(origs[0], color, orientation, 0);
        if (origs.length > 1)
            squares = squares.concat(renderSquares(origs[1], color, orientation, 1));
        return snabbdom_1.h("div#extension_choice." + vertical, {
            hook: {
                insert: vnode => {
                    const el = vnode.elm;
                    el.addEventListener("click", () => cancel());
                    el.addEventListener("contextmenu", e => {
                        e.preventDefault();
                        return false;
                    });
                }
            }
        }, squares);
    }
    return {
        start,
    };
}
exports.default = default_1;

},{"./chess":35,"./pocket":43,"chessgroundx/util":17,"snabbdom":26,"snabbdom/modules/attributes":22,"snabbdom/modules/class":23,"snabbdom/modules/eventlisteners":24,"snabbdom/tovnode":28}],38:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sockette_1 = __importDefault(require("sockette"));
const snabbdom_1 = require("snabbdom");
const class_1 = __importDefault(require("snabbdom/modules/class"));
const attributes_1 = __importDefault(require("snabbdom/modules/attributes"));
const props_1 = __importDefault(require("snabbdom/modules/props"));
const eventlisteners_1 = __importDefault(require("snabbdom/modules/eventlisteners"));
const patch = snabbdom_1.init([class_1.default, attributes_1.default, props_1.default, eventlisteners_1.default]);
const h_1 = __importDefault(require("snabbdom/h"));
const user_1 = require("./user");
const chat_1 = require("./chat");
const chess_1 = require("./chess");
const sound_1 = require("./sound");
class LobbyController {
    constructor(el, model) {
        this.onMsgGetSeeks = (msg) => {
            this.seeks = msg.seeks;
            // console.log("!!!! got get_seeks msg:", msg);
            const oldVNode = document.getElementById('seeks');
            if (oldVNode instanceof Element) {
                oldVNode.innerHTML = '';
                patch(oldVNode, h_1.default('table#seeks', this.renderSeeks(msg.seeks)));
            }
        };
        this.onMsgNewGame = (msg) => {
            console.log("LobbyController.onMsgNewGame()", this.model["gameId"]);
            window.location.assign(this.model["home"] + '/' + msg["gameId"]);
        };
        this.onMsgUserConnected = (msg) => {
            this.model["username"] = msg["username"];
            user_1.renderUsername(this.model["home"], this.model["username"]);
        };
        this.onMsgChat = (msg) => {
            if (msg.user !== this.model["username"]) {
                chat_1.chatMessage(msg.user, msg.message, "lobbychat");
                if (msg.user.length !== 0 && msg.user !== '_server')
                    sound_1.sound.chat();
            }
        };
        this.onMsgFullChat = (msg) => {
            msg.lines.forEach((line) => { chat_1.chatMessage(line.user, line.message, "lobbychat"); });
        };
        this.onMsgPing = (msg) => {
            this.doSend({ type: "pong", timestamp: msg.timestamp });
        };
        this.onMsgShutdown = (msg) => {
            alert(msg.message);
        };
        console.log("LobbyController constructor", el, model);
        this.model = model;
        this.challengeAI = false;
        const onOpen = (evt) => {
            this._ws = evt.target;
            console.log("---CONNECTED", evt);
            this.doSend({ type: "lobby_user_connected", username: this.model["username"] });
            this.doSend({ type: "get_seeks" });
        };
        this._ws = { "readyState": -1 };
        const opts = {
            maxAttempts: 20,
            onopen: e => onOpen(e),
            onmessage: e => this.onMessage(e),
            onreconnect: e => console.log('Reconnecting in lobby...', e),
            onmaximum: e => console.log('Stop Attempting!', e),
            onclose: e => { console.log('Closed!', e); },
            onerror: e => console.log('Error:', e),
        };
        try {
            this.sock = new sockette_1.default("ws://" + location.host + "/wsl", opts);
        }
        catch (err) {
            this.sock = new sockette_1.default("wss://" + location.host + "/wsl", opts);
        }
        // get seeks when we are coming back after a game
        if (this._ws.readyState === 1) {
            this.doSend({ type: "get_seeks" });
        }
        ;
        patch(document.getElementById('seekbuttons'), h_1.default('ul#seekbuttons', this.renderSeekButtons()));
        patch(document.getElementById('lobbychat'), chat_1.chatView(this, "lobbychat"));
    }
    doSend(message) {
        console.log("---> lobby doSend():", message);
        this.sock.send(JSON.stringify(message));
    }
    createSeekMsg(variant, color, fen, minutes, increment, chess960) {
        this.doSend({
            type: "create_seek",
            user: this.model["username"],
            variant: variant,
            fen: fen,
            minutes: minutes,
            increment: increment,
            rated: false,
            chess960: chess960,
            color: color
        });
    }
    createBotChallengeMsg(variant, color, fen, minutes, increment, level, chess960) {
        this.doSend({
            type: "create_ai_challenge",
            user: this.model["username"],
            variant: variant,
            fen: fen,
            minutes: minutes,
            increment: increment,
            rated: false,
            level: level,
            chess960: chess960,
            color: color
        });
    }
    isNewSeek(variant, color, fen, minutes, increment) {
        return !this.seeks.some(seek => {
            return seek.user === this.model["username"] && seek.variant === variant && seek.fen === fen && seek.color === color && seek.tc === minutes + "+" + increment;
        });
    }
    createSeek(color) {
        document.getElementById('id01').style.display = 'none';
        let e;
        e = document.getElementById('variant');
        const variant = e.options[e.selectedIndex].value;
        localStorage.setItem("seek_variant", variant);
        e = document.getElementById('fen');
        const fen = e.value;
        localStorage.setItem("seek_fen", e.value);
        e = document.getElementById('min');
        const minutes = parseInt(e.value);
        localStorage.setItem("seek_min", e.value);
        e = document.getElementById('inc');
        const increment = parseInt(e.value);
        localStorage.setItem("seek_inc", e.value);
        e = document.getElementById('chess960');
        const hide = chess_1.variants960.indexOf(variant) === -1;
        const chess960 = (hide) ? false : e.checked;
        console.log("CREATE SEEK variant, color, fen, minutes, increment, hide, chess960", variant, color, fen, minutes, increment, hide, chess960);
        localStorage.setItem("seek_chess960", e.checked);
        if (this.challengeAI) {
            e = document.querySelector('input[name="level"]:checked');
            const level = parseInt(e.value);
            localStorage.setItem("seek_level", e.value);
            console.log(level, e.value, localStorage.getItem("seek_level"));
            this.createBotChallengeMsg(variant, color, fen, minutes, increment, level, chess960);
        }
        else {
            if (this.isNewSeek(variant, color, fen, minutes, increment)) {
                this.createSeekMsg(variant, color, fen, minutes, increment, chess960);
            }
        }
    }
    renderSeekButtons() {
        const setVariant = () => {
            let e;
            e = document.getElementById('variant');
            const variant = e.options[e.selectedIndex].value;
            const hide = chess_1.variants960.indexOf(variant) === -1;
            document.getElementById('chess960-block').style.display = (hide) ? 'none' : 'block';
        };
        const setMinutes = (minutes) => {
            var min, inc = 0;
            var el = document.getElementById("minutes");
            if (el)
                el.innerHTML = minutes;
            var e = document.getElementById('min');
            if (e)
                min = parseInt(e.value);
            e = document.getElementById('inc');
            if (e)
                inc = parseInt(e.value);
            document.getElementById('color-button-group').style.display = (min + inc === 0) ? 'none' : 'block';
        };
        const setIncrement = (increment) => {
            var min, inc = 0;
            var el = document.getElementById("increment");
            if (el)
                el.innerHTML = increment;
            var e = document.getElementById('min');
            if (e)
                min = parseInt(e.value);
            e = document.getElementById('inc');
            if (e)
                inc = parseInt(e.value);
            document.getElementById('color-button-group').style.display = (min + inc === 0) ? 'none' : 'block';
        };
        const vIdx = localStorage.seek_variant === undefined ? 0 : chess_1.variants.indexOf(localStorage.seek_variant);
        const vFen = localStorage.seek_fen === undefined ? "" : localStorage.seek_fen;
        const vMin = localStorage.seek_min === undefined ? "5" : localStorage.seek_min;
        const vInc = localStorage.seek_inc === undefined ? "3" : localStorage.seek_inc;
        const vLevel = localStorage.seek_level === undefined ? "1" : localStorage.seek_level;
        const vChess960 = localStorage.seek_chess960 === undefined ? "false" : localStorage.seek_chess960;
        console.log("localeStorage.seek_level, vLevel=", localStorage.seek_level, vLevel);
        return [
            h_1.default('div#id01', { class: { "modal": true } }, [
                h_1.default('form.modal-content', [
                    h_1.default('div#closecontainer', [
                        h_1.default('span.close', { on: { click: () => document.getElementById('id01').style.display = 'none' }, attrs: { 'data-icon': 'j' }, props: { title: "Cancel" } }),
                    ]),
                    h_1.default('div.container', [
                        h_1.default('label', { attrs: { for: "variant" } }, "Variant"),
                        h_1.default('select#variant', {
                            props: { name: "variant" },
                            on: { input: () => setVariant() },
                            hook: { insert: () => setVariant() },
                        }, chess_1.variants.map((variant, idx) => h_1.default('option', { props: { value: variant, selected: (idx === vIdx) ? "selected" : "" } }, variant))),
                        h_1.default('label', { attrs: { for: "fen" } }, "Start position"),
                        h_1.default('input#fen', { props: { name: 'fen', placeholder: 'Paste the FEN text here', value: vFen } }),
                        h_1.default('div#chess960-block', [
                            h_1.default('label', { attrs: { for: "chess960" } }, "Chess960"),
                            h_1.default('input#chess960', { props: { name: "chess960", type: "checkbox", checked: vChess960 === "true" ? "checked" : "" } }),
                        ]),
                        //h('label', { attrs: {for: "tc"} }, "Time Control"),
                        //h('select#timecontrol', { props: {name: "timecontrol"} }, [
                        //    h('option', { props: {value: "1", selected: true} }, "Real time"),
                        //    h('option', { props: {value: "2"} }, "Unlimited"),
                        //]),
                        h_1.default('label', { attrs: { for: "min" } }, "Minutes per side:"),
                        h_1.default('span#minutes'),
                        h_1.default('input#min', { class: { "slider": true },
                            props: { name: "min", type: "range", min: 0, max: 60, value: vMin },
                            on: { input: (e) => setMinutes(e.target.value) },
                            hook: { insert: (vnode) => setMinutes(vnode.elm.value) },
                        }),
                        h_1.default('label', { attrs: { for: "inc" } }, "Increment in seconds:"),
                        h_1.default('span#increment'),
                        h_1.default('input#inc', { class: { "slider": true },
                            props: { name: "inc", type: "range", min: 0, max: 15, value: vInc },
                            on: { input: (e) => setIncrement(e.target.value) },
                            hook: { insert: (vnode) => setIncrement(vnode.elm.value) },
                        }),
                        // if play with the machine
                        // A.I.Level (1-8 buttons)
                        h_1.default('form#ailevel', [
                            h_1.default('h4', "A.I. Level"),
                            h_1.default('div.ai-radio-group', [
                                h_1.default('input#ai1', { props: { type: "radio", name: "level", value: "1", checked: vLevel === "1" ? "checked" : "" } }),
                                h_1.default('label.level-ai.ai1', { attrs: { for: "ai1" } }, "1"),
                                h_1.default('input#ai2', { props: { type: "radio", name: "level", value: "2", checked: vLevel === "2" ? "checked" : "" } }),
                                h_1.default('label.level-ai.ai2', { attrs: { for: "ai2" } }, "2"),
                                h_1.default('input#ai3', { props: { type: "radio", name: "level", value: "3", checked: vLevel === "3" ? "checked" : "" } }),
                                h_1.default('label.level-ai.ai3', { attrs: { for: "ai3" } }, "3"),
                                h_1.default('input#ai4', { props: { type: "radio", name: "level", value: "4", checked: vLevel === "4" ? "checked" : "" } }),
                                h_1.default('label.level-ai.ai4', { attrs: { for: "ai4" } }, "4"),
                                h_1.default('input#ai5', { props: { type: "radio", name: "level", value: "5", checked: vLevel === "5" ? "checked" : "" } }),
                                h_1.default('label.level-ai.ai5', { attrs: { for: "ai5" } }, "5"),
                                h_1.default('input#ai6', { props: { type: "radio", name: "level", value: "6", checked: vLevel === "6" ? "checked" : "" } }),
                                h_1.default('label.level-ai.ai6', { attrs: { for: "ai6" } }, "6"),
                                h_1.default('input#ai7', { props: { type: "radio", name: "level", value: "7", checked: vLevel === "7" ? "checked" : "" } }),
                                h_1.default('label.level-ai.ai7', { attrs: { for: "ai7" } }, "7"),
                                h_1.default('input#ai8', { props: { type: "radio", name: "level", value: "8", checked: vLevel === "8" ? "checked" : "" } }),
                                h_1.default('label.level-ai.ai8', { attrs: { for: "ai8" } }, "8"),
                            ]),
                        ]),
                        h_1.default('div#color-button-group', [
                            h_1.default('button.icon.icon-black', { props: { type: "button", title: "Black" }, on: { click: () => this.createSeek('b') } }),
                            h_1.default('button.icon.icon-adjust', { props: { type: "button", title: "Random" }, on: { click: () => this.createSeek('r') } }),
                            h_1.default('button.icon.icon-white', { props: { type: "button", title: "White" }, on: { click: () => this.createSeek('w') } }),
                        ]),
                    ]),
                ]),
            ]),
            h_1.default('button', { class: { 'lobby-button': true }, on: {
                    click: () => {
                        this.challengeAI = false;
                        document.getElementById('ailevel').style.display = 'none';
                        document.getElementById('id01').style.display = 'block';
                    }
                } }, "Create a game"),
            h_1.default('button', { class: { 'lobby-button': true }, on: {
                    click: () => {
                        this.challengeAI = true;
                        document.getElementById('ailevel').style.display = 'inline-block';
                        document.getElementById('id01').style.display = 'block';
                    }
                } }, "Play with the machine"),
        ];
    }
    onClickSeek(seek) {
        if (seek["user"] === this.model["username"]) {
            this.doSend({ type: "delete_seek", seekID: seek["seekID"], player: this.model["username"] });
        }
        else {
            this.doSend({ type: "accept_seek", seekID: seek["seekID"], player: this.model["username"] });
        }
    }
    renderSeeks(seeks) {
        // TODO: fix header and data row colomns
        // https://stackoverflow.com/questions/37272331/html-table-with-fixed-header-and-footer-and-scrollable-body-without-fixed-widths
        const header = h_1.default('thead', [h_1.default('tr', [h_1.default('th', 'Player'),
                h_1.default('th', 'Color'),
                h_1.default('th', 'Rating'),
                h_1.default('th', 'Time'),
                h_1.default('th', '    '),
                h_1.default('th', 'Variant'),
                h_1.default('th', 'Mode')])]);
        const colorIcon = (color) => { return h_1.default('i', { attrs: { "data-icon": color === "w" ? "c" : color === "b" ? "b" : "a" } }); };
        var rows = seeks.map((seek) => h_1.default('tr', { on: { click: () => this.onClickSeek(seek) } }, [h_1.default('td', seek["user"]),
            h_1.default('td', [colorIcon(seek["color"])]),
            h_1.default('td', '1500?'),
            h_1.default('td', seek["tc"]),
            h_1.default('td', { attrs: { "data-icon": chess_1.VARIANTS[seek["variant"]].icon }, class: { "icon": true } }),
            h_1.default('td', { attrs: { "data-icon": (seek.chess960) ? "V" : "" }, class: { "icon": true } }),
            h_1.default('td', seek["variant"]),
            h_1.default('td', seek["rated"])]));
        return [header, h_1.default('tbody', rows)];
    }
    onMessage(evt) {
        console.log("<+++ lobby onMessage():", evt.data);
        var msg = JSON.parse(evt.data);
        switch (msg.type) {
            case "get_seeks":
                this.onMsgGetSeeks(msg);
                break;
            case "new_game":
                this.onMsgNewGame(msg);
                break;
            case "lobby_user_connected":
                this.onMsgUserConnected(msg);
                break;
            case "lobbychat":
                this.onMsgChat(msg);
                break;
            case "fullchat":
                this.onMsgFullChat(msg);
                break;
            case "ping":
                this.onMsgPing(msg);
                break;
            case "shutdown":
                this.onMsgShutdown(msg);
                break;
        }
    }
}
function runSeeks(vnode, model) {
    const el = vnode.elm;
    const ctrl = new LobbyController(el, model);
    console.log("lobbyView() -> runSeeks()", el, model, ctrl);
}
function lobbyView(model) {
    // Get the modal
    const modal = document.getElementById('id01');
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };
    return [h_1.default('aside.sidebar-first', [h_1.default('div.lobbychat#lobbychat')]),
        h_1.default('main.main', [h_1.default('table#seeks', { hook: { insert: (vnode) => runSeeks(vnode, model) } })]),
        h_1.default('aside.sidebar-second', [h_1.default('ul#seekbuttons')]),
        h_1.default('under-left', "# of users"),
        h_1.default('under-lobby'),
        h_1.default('under-right', [
            h_1.default('a', {
                class: { 'donate-button': true },
                attrs: { href: 'https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=NC73JXRBQNTAN&source=url' }
            }, 'Directly support us')
        ]),
    ];
}
exports.lobbyView = lobbyView;

},{"./chat":34,"./chess":35,"./sound":50,"./user":51,"snabbdom":26,"snabbdom/h":19,"snabbdom/modules/attributes":22,"snabbdom/modules/class":23,"snabbdom/modules/eventlisteners":24,"snabbdom/modules/props":25,"sockette":30}],39:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const class_1 = __importDefault(require("snabbdom/modules/class"));
const attributes_1 = __importDefault(require("snabbdom/modules/attributes"));
const props_1 = __importDefault(require("snabbdom/modules/props"));
const eventlisteners_1 = __importDefault(require("snabbdom/modules/eventlisteners"));
const h_1 = __importDefault(require("snabbdom/h"));
const patch = snabbdom_1.init([class_1.default, attributes_1.default, props_1.default, eventlisteners_1.default]);
const about_1 = require("./about");
const lobby_1 = require("./lobby");
const round_1 = require("./round");
const analysis_1 = require("./analysis");
const players_1 = require("./players");
const profile_1 = require("./profile");
const model = { home: "", username: "", anon: "", variant: "", gameId: 0, wplayer: "", bplayer: "", fen: "", base: "", inc: "", seeks: [], tv: "", profileid: "", status: "" };
var getCookie = function (name) {
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; ++i) {
        var pair = cookies[i].trim().split('=');
        if (pair[0] == name)
            return pair[1];
    }
    return "";
};
function view(el, model) {
    const user = getCookie("user");
    if (user !== "")
        model["username"] = user;
    model["home"] = el.getAttribute("data-home");
    model["anon"] = el.getAttribute("data-anon");
    model["profileid"] = el.getAttribute("data-profile");
    model["variant"] = el.getAttribute("data-variant");
    model["chess960"] = el.getAttribute("data-chess960");
    model["level"] = el.getAttribute("data-level");
    model["username"] = user !== "" ? user : el.getAttribute("data-user");
    model["gameId"] = el.getAttribute("data-gameid");
    model["wplayer"] = el.getAttribute("data-wplayer");
    model["wtitle"] = el.getAttribute("data-wtitle");
    model["bplayer"] = el.getAttribute("data-bplayer");
    model["btitle"] = el.getAttribute("data-btitle");
    model["fen"] = el.getAttribute("data-fen");
    model["base"] = el.getAttribute("data-base");
    model["inc"] = el.getAttribute("data-inc");
    model["result"] = el.getAttribute("data-result");
    model["status"] = el.getAttribute("data-status");
    model["date"] = el.getAttribute("data-date");
    model["tv"] = el.getAttribute("data-view") === 'tv';
    switch (el.getAttribute("data-view")) {
        case 'about':
            return h_1.default('div#placeholder.main-wrapper', about_1.aboutView(model));
        case 'howtoplay':
            return h_1.default('iframe', { props: { src: model["home"] + "/static/docs/variants.html", height: "100%", width: "100%", seamless: "" } });
        case 'players':
            return h_1.default('div#placeholder.players-wrapper', players_1.playersView(model));
        case 'profile':
            return h_1.default('div#placeholder.profile-wrapper', profile_1.profileView(model));
        case 'tv':
        case 'round':
            return h_1.default('div#placeholder.main-wrapper', round_1.roundView(model));
        case 'analysis':
            return h_1.default('div#placeholder.main-wrapper', analysis_1.analysisView(model));
        case 'thanks':
            return h_1.default('div#placeholder.main-wrapper', h_1.default('h2', 'Thank you for your support!'));
        default:
            return h_1.default('div#placeholder.main-wrapper', lobby_1.lobbyView(model));
    }
}
exports.view = view;
const el = document.getElementById('pychess-variants');
if (el instanceof Element) {
    patch(document.getElementById('placeholder'), view(el, model));
}

},{"./about":31,"./analysis":32,"./lobby":38,"./players":42,"./profile":44,"./round":47,"snabbdom":26,"snabbdom/h":19,"snabbdom/modules/attributes":22,"snabbdom/modules/class":23,"snabbdom/modules/eventlisteners":24,"snabbdom/modules/props":25}],40:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const class_1 = __importDefault(require("snabbdom/modules/class"));
const attributes_1 = __importDefault(require("snabbdom/modules/attributes"));
const props_1 = __importDefault(require("snabbdom/modules/props"));
const eventlisteners_1 = __importDefault(require("snabbdom/modules/eventlisteners"));
const patch = snabbdom_1.init([class_1.default, attributes_1.default, props_1.default, eventlisteners_1.default]);
const h_1 = __importDefault(require("snabbdom/h"));
const settings_1 = require("./settings");
const roundCtrl_1 = __importDefault(require("./roundCtrl"));
function selectMove(ctrl, ply) {
    console.log("selctMove()", ply);
    const active = document.querySelector('li.move.active');
    if (active)
        active.classList.remove('active');
    const elPly = document.querySelector(`li.move[ply="${ply}"]`);
    if (elPly)
        elPly.classList.add('active');
    ctrl.goPly(ply);
    scrollToPly(ctrl);
}
exports.selectMove = selectMove;
function scrollToPly(ctrl) {
    if (ctrl.steps.length < 9)
        return;
    const movesEl = document.getElementById('moves');
    const plyEl = movesEl.querySelector('li.move.active');
    const movelistblockEl = document.getElementById('movelist-block');
    let st = undefined;
    if (ctrl.ply == 0)
        st = 0;
    else if (ctrl.ply == ctrl.steps.length - 1)
        st = 99999;
    else if (plyEl)
        st = plyEl.offsetTop - movelistblockEl.offsetHeight + plyEl.offsetHeight;
    if (typeof st == 'number') {
        if (plyEl && ctrl instanceof roundCtrl_1.default) {
            var isSmoothScrollSupported = 'scrollBehavior' in document.documentElement.style;
            if (isSmoothScrollSupported) {
                plyEl.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            else {
                plyEl.scrollIntoView(false);
            }
        }
        else {
            console.log("scrollToPly", ctrl.ply, st);
            movelistblockEl.scrollTop = st;
        }
    }
}
function movelistView(ctrl) {
    ctrl.vgear = settings_1.gearButton(ctrl);
    var container = document.getElementById('move-controls');
    ctrl.moveControls = patch(container, h_1.default('div.btn-controls', [
        h_1.default('button', { on: { click: () => settings_1.toggleOrientation(ctrl) } }, [h_1.default('i', { props: { title: 'Flip board' }, class: { "icon": true, "icon-refresh": true } }),]),
        h_1.default('button', { on: { click: () => selectMove(ctrl, 0) } }, [h_1.default('i', { class: { "icon": true, "icon-fast-backward": true } }),]),
        h_1.default('button', { on: { click: () => selectMove(ctrl, Math.max(ctrl.ply - 1, 0)) } }, [h_1.default('i', { class: { "icon": true, "icon-step-backward": true } }),]),
        h_1.default('button', { on: { click: () => selectMove(ctrl, Math.min(ctrl.ply + 1, ctrl.steps.length - 1)) } }, [h_1.default('i', { class: { "icon": true, "icon-step-forward": true } }),]),
        h_1.default('button', { on: { click: () => selectMove(ctrl, ctrl.steps.length - 1) } }, [h_1.default('i', { class: { "icon": true, "icon-fast-forward": true } }),]),
        ctrl.vgear,
    ]));
    if (ctrl instanceof roundCtrl_1.default) {
        return h_1.default('div#moves', [h_1.default('ol.movelist#movelist')]);
    }
    else {
        return h_1.default('div.anal#moves', [h_1.default('ol.movelist#movelist')]);
    }
}
exports.movelistView = movelistView;
function updateMovelist(ctrl) {
    var container = document.getElementById('movelist');
    const ply = ctrl.steps.length - 1;
    const move = ctrl.steps[ply]['san'];
    const active = document.querySelector('li.move.active');
    if (active)
        active.classList.remove('active');
    const el = h_1.default('li.move', { class: { active: true }, attrs: { ply: ply }, on: { click: () => selectMove(ctrl, ply) } }, move);
    if (ply % 2 == 0) {
        patch(container, h_1.default('ol.movelist#movelist', [el]));
    }
    else {
        patch(container, h_1.default('ol.movelist#movelist', [h_1.default('li.move.counter', (ply + 1) / 2), el]));
    }
    scrollToPly(ctrl);
}
exports.updateMovelist = updateMovelist;

},{"./roundCtrl":48,"./settings":49,"snabbdom":26,"snabbdom/h":19,"snabbdom/modules/attributes":22,"snabbdom/modules/class":23,"snabbdom/modules/eventlisteners":24,"snabbdom/modules/props":25}],41:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const h_1 = __importDefault(require("snabbdom/h"));
function player(id, title, name, level) {
    return h_1.default('round-player', [
        h_1.default('div.player-data', [
            h_1.default('i-side.online#' + id, { class: { "icon": true, "icon-online": false, "icon-offline": true } }),
            h_1.default('player', [
                h_1.default('a.user-link', { attrs: { href: '/@/' + name } }, [
                    h_1.default('player-title', " " + title + " "),
                    name + ((title === "BOT" && level > 0) ? ' level ' + level : ''),
                ]),
                h_1.default('rating', "1500?"),
            ]),
        ]),
    ]);
}
exports.player = player;

},{"snabbdom/h":19}],42:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const class_1 = __importDefault(require("snabbdom/modules/class"));
const attributes_1 = __importDefault(require("snabbdom/modules/attributes"));
const props_1 = __importDefault(require("snabbdom/modules/props"));
const eventlisteners_1 = __importDefault(require("snabbdom/modules/eventlisteners"));
const patch = snabbdom_1.init([class_1.default, attributes_1.default, props_1.default, eventlisteners_1.default]);
const h_1 = __importDefault(require("snabbdom/h"));
const user_1 = require("./user");
function renderPlayers(model, players) {
    console.log("players", model, players);
    const header = h_1.default('thead', [h_1.default('tr', [h_1.default('th', 'Players'),])]);
    var rows = players.map((player) => h_1.default('tr', [
        h_1.default('td.player-data', [
            h_1.default('i-side.online', { class: { "icon": true, "icon-online": player["online"], "icon-offline": !player["online"] } }),
            h_1.default('player', [
                h_1.default('a.user-link', { attrs: { href: '/@/' + player["_id"] } }, [
                    h_1.default('player-title', " " + player["title"] + " "),
                    player["_id"],
                ]),
            ]),
        ])
    ]));
    return [header, h_1.default('tbody', rows)];
}
function playersView(model) {
    user_1.renderUsername(model["home"], model["username"]);
    var xmlhttp = new XMLHttpRequest();
    var url = model["home"] + "/api/players";
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            var myArr = JSON.parse(this.responseText);
            myFunction(myArr);
        }
    };
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
    function myFunction(arr) {
        const oldVNode = document.getElementById('players');
        console.log(arr);
        if (oldVNode instanceof Element) {
            patch(oldVNode, h_1.default('table#players', renderPlayers(model, arr)));
        }
    }
    console.log(model);
    return [h_1.default('aside.sidebar-first'),
        h_1.default('main.main', [h_1.default('table#players')]),
        h_1.default('aside.sidebar-second'),
    ];
}
exports.playersView = playersView;

},{"./user":51,"snabbdom":26,"snabbdom/h":19,"snabbdom/modules/attributes":22,"snabbdom/modules/class":23,"snabbdom/modules/eventlisteners":24,"snabbdom/modules/props":25}],43:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const class_1 = __importDefault(require("snabbdom/modules/class"));
const attributes_1 = __importDefault(require("snabbdom/modules/attributes"));
const props_1 = __importDefault(require("snabbdom/modules/props"));
const eventlisteners_1 = __importDefault(require("snabbdom/modules/eventlisteners"));
const drag_1 = require("chessgroundx/drag");
//import { setDropMode, cancelDropMode } from 'chessgroundx/drop';
const chess_1 = require("./chess");
const patch = snabbdom_1.init([class_1.default, attributes_1.default, props_1.default, eventlisteners_1.default]);
const eventNames = ['mousedown', 'touchstart'];
function pocketView(ctrl, color, position) {
    const pocket = ctrl.pockets[position === 'top' ? 0 : 1];
    const pieceRoles = Object.keys(pocket);
    return snabbdom_1.h('div.pocket.' + position, {
        class: { usable: true },
        hook: {
            insert: vnode => {
                eventNames.forEach(name => {
                    vnode.elm.addEventListener(name, (e) => {
                        if (position === (ctrl.flip ? 'top' : 'bottom'))
                            drag(ctrl, e);
                    });
                });
            }
        }
    }, pieceRoles.map(role => {
        let nb = pocket[role] || 0;
        return snabbdom_1.h('piece.' + role + '.' + color, {
            attrs: {
                'data-role': role,
                'data-color': color,
                'data-nb': nb,
            }
        });
    }));
}
exports.pocketView = pocketView;
function drag(ctrl, e) {
    if (e.button !== undefined && e.button !== 0)
        return; // only touch or left click
    const el = e.target, role = el.getAttribute('data-role'), color = el.getAttribute('data-color'), number = el.getAttribute('data-nb');
    if (!role || !color || number === '0')
        return;
    if (ctrl.clickDrop !== undefined && role === ctrl.clickDrop.role) {
        ctrl.clickDrop = undefined;
        ctrl.chessground.selectSquare(null);
        //cancelDropMode(ctrl.chessground.state);
        return;
    }
    else {
        //setDropMode(ctrl.chessground.state, number !== '0' ? { color, role } : undefined);
    }
    ;
    // Show possible drop dests on my turn only not to mess up predrop
    if (ctrl.turnColor === ctrl.mycolor) {
        const dropDests = { 'z0': ctrl.dests[chess_1.roleToSan[role] + "@"] };
        console.log("     new piece to z0", role);
        ctrl.chessground.newPiece({ "role": role, "color": color }, 'z0');
        ctrl.chessground.set({
            turnColor: color,
            movable: {
                dests: dropDests,
                showDests: true,
            },
        });
        ctrl.chessground.selectSquare('z0');
        ctrl.chessground.set({ lastMove: ctrl.lastmove });
    }
    e.stopPropagation();
    e.preventDefault();
    drag_1.dragNewPiece(ctrl.chessground.state, { color, role }, e);
}
exports.drag = drag;
function dropIsValid(dests, role, key) {
    const drops = dests[chess_1.roleToSan[role] + "@"];
    // console.log("drops:", drops)
    if (drops === undefined || drops === null)
        return false;
    return drops.indexOf(key) !== -1;
}
exports.dropIsValid = dropIsValid;
// TODO: after 1 move made only 1 pocket update needed at once, no need to update both
function updatePockets(ctrl, vpocket0, vpocket1) {
    // update pockets from fen
    if (chess_1.needPockets(ctrl.variant)) {
        const parts = ctrl.fullfen.split(" ");
        const fen_placement = parts[0];
        var pockets = "";
        const bracketPos = fen_placement.indexOf("[");
        if (bracketPos !== -1) {
            pockets = fen_placement.slice(bracketPos);
        }
        const c = ctrl.mycolor[0];
        const o = ctrl.oppcolor[0];
        const roles = chess_1.pocketRoles(ctrl.variant);
        var po = {};
        var pc = {};
        roles.forEach(role => pc[role] = chess_1.lc(pockets, chess_1.roleToSan[role].toLowerCase(), c === (ctrl.variant === 'shogi' ? 'b' : 'w')));
        roles.forEach(role => po[role] = chess_1.lc(pockets, chess_1.roleToSan[role].toLowerCase(), o === (ctrl.variant === 'shogi' ? 'b' : 'w')));
        if (ctrl.flip) {
            ctrl.pockets = [pc, po];
        }
        else {
            ctrl.pockets = [po, pc];
        }
        console.log(o, c, po, pc);
        ctrl.vpocket0 = patch(vpocket0, pocketView(ctrl, ctrl.flip ? ctrl.mycolor : ctrl.oppcolor, "top"));
        ctrl.vpocket1 = patch(vpocket1, pocketView(ctrl, ctrl.flip ? ctrl.oppcolor : ctrl.mycolor, "bottom"));
    }
}
exports.updatePockets = updatePockets;

},{"./chess":35,"chessgroundx/drag":6,"snabbdom":26,"snabbdom/modules/attributes":22,"snabbdom/modules/class":23,"snabbdom/modules/eventlisteners":24,"snabbdom/modules/props":25}],44:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const class_1 = __importDefault(require("snabbdom/modules/class"));
const attributes_1 = __importDefault(require("snabbdom/modules/attributes"));
const props_1 = __importDefault(require("snabbdom/modules/props"));
const eventlisteners_1 = __importDefault(require("snabbdom/modules/eventlisteners"));
const patch = snabbdom_1.init([class_1.default, attributes_1.default, props_1.default, eventlisteners_1.default]);
const h_1 = __importDefault(require("snabbdom/h"));
const chessgroundx_1 = require("chessgroundx");
const user_1 = require("./user");
const chess_1 = require("./chess");
const clock_1 = require("./clock");
const settings_1 = require("./settings");
function result(status, result) {
    var text = '';
    console.log("result()", status, result);
    switch (status) {
        case -2:
        case -1:
            text = 'Playing right now';
            break;
        case 0:
            text = 'Game aborted';
            break;
        case 1:
            text = 'Checkmate';
            break;
        case 2:
            text = ((result === '1-0') ? 'Black' : 'White') + ' resigned';
            break;
        case 3:
            text = 'Stalemate';
            break;
        case 4:
            text = 'Time out';
            break;
        case 5:
            text = 'Draw';
            break;
        case 6:
            text = 'Time out';
            break;
        case 7:
            text = ((result === '1-0') ? 'Black' : 'White') + ' abandoned the game';
            break;
        default:
            text = '*';
            break;
    }
    return (status <= 0) ? text : text + ', ' + result;
}
exports.result = result;
function renderGames(model, games) {
    //                h('fn', player["first_name"]),
    //                h('ln', player["last_name"]),
    //                h('country', player["country"]),
    var rows = games.map((game) => h_1.default('tr', { on: { click: () => { window.location.assign(model["home"] + '/' + game["_id"]); } },
    }, [
        h_1.default('td.board', [
            h_1.default('selection.' + chess_1.VARIANTS[game["v"]].board + '.' + chess_1.VARIANTS[game["v"]].pieces, [
                h_1.default('div.cg-wrap.' + chess_1.VARIANTS[game["v"]].cg + '.mini', { hook: {
                        insert: (vnode) => {
                            chessgroundx_1.Chessground(vnode.elm, {
                                coordinates: false,
                                viewOnly: true,
                                fen: game["f"],
                                geometry: chess_1.VARIANTS[game["v"]].geom
                            });
                        }
                    } }),
            ]),
        ]),
        h_1.default('td.games-info', [
            h_1.default('div.info0', { attrs: { "data-icon": chess_1.VARIANTS[game["v"]].icon }, class: { "icon": true } }, [
                h_1.default('div.info1', { attrs: { "data-icon": (game["z"] === 1) ? "V" : "" }, class: { "icon": true } }),
                h_1.default('div.info2', [
                    h_1.default('div.tc', game["b"] + "+" + game["i"] + " • Casual • " + game["v"]),
                    h_1.default('info-date', { attrs: { timestamp: game["d"] } }),
                ]),
            ]),
            h_1.default('div', [
                h_1.default('player', [
                    h_1.default('a.user-link', { attrs: { href: '/@/' + game["us"][0] } }, [
                        h_1.default('player-title', " " + game["wt"] + " "),
                        game["us"][0] + ((game["wt"] === 'BOT' && game['x'] > 0) ? ' level ' + game['x'] : ''),
                    ]),
                ]),
                h_1.default('vs', ' - '),
                h_1.default('player', [
                    h_1.default('a.user-link', { attrs: { href: '/@/' + game["us"][1] } }, [
                        h_1.default('player-title', " " + game["bt"] + " "),
                        game["us"][1] + ((game["bt"] === 'BOT' && game['x'] > 0) ? ' level ' + game['x'] : ''),
                    ]),
                ]),
            ]),
            h_1.default('div.info-result', {
                class: {
                    "win": (game["r"] === '1-0' && game["us"][0] === model["profileid"]) || (game["r"] === '0-1' && game["us"][1] === model["profileid"]),
                    "lose": (game["r"] === '0-1' && game["us"][0] === model["profileid"]) || (game["r"] === '1-0' && game["us"][1] === model["profileid"]),
                }
            }, result(game["s"], game["r"])),
        ])
    ]));
    return [h_1.default('tbody', rows)];
}
function loadGames(model, page) {
    var xmlhttp = new XMLHttpRequest();
    var url = model["home"] + "/api/" + model["profileid"] + "/games?p=";
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            var myArr = JSON.parse(this.responseText);
            // If empty JSON, exit the function
            if (!myArr.length) {
                return;
            }
            myFunction(myArr);
        }
    };
    xmlhttp.open("GET", url + page, true);
    xmlhttp.send();
    function myFunction(arr) {
        const oldVNode = document.getElementById('games');
        console.log(arr);
        if (oldVNode instanceof Element) {
            patch(oldVNode, h_1.default('table#games', renderGames(model, arr)));
        }
        clock_1.renderTimeago();
    }
}
function observeSentinel(vnode, model) {
    const sentinel = vnode.elm;
    var page = 0;
    var intersectionObserver = new IntersectionObserver(entries => {
        // If intersectionRatio is 0, the sentinel is out of view
        // and we don't need to do anything. Exit the function
        if (entries[0].intersectionRatio <= 0)
            return;
        loadGames(model, page);
        page += 1;
    });
    intersectionObserver.observe(sentinel);
}
function profileView(model) {
    user_1.renderUsername(model["home"], model["username"]);
    console.log(model);
    const CSSindexesB = chess_1.variants.map((variant) => localStorage[variant + "_board"] === undefined ? 0 : Number(localStorage[variant + "_board"]));
    const CSSindexesP = chess_1.variants.map((variant) => localStorage[variant + "_pieces"] === undefined ? 0 : Number(localStorage[variant + "_pieces"]));
    Object.keys(chess_1.VARIANTS).forEach((key) => {
        const variant = chess_1.VARIANTS[key];
        if (variant.BoardCSS.length > 1) {
            var idx = CSSindexesB[chess_1.variants.indexOf(key)];
            idx = Math.min(idx, variant.BoardCSS.length - 1);
            settings_1.changeCSS('/static/' + variant.BoardCSS[idx] + '.css');
        }
        ;
        if (variant.PieceCSS.length > 1) {
            var idx = CSSindexesP[chess_1.variants.indexOf(key)];
            idx = Math.min(idx, variant.PieceCSS.length - 1);
            settings_1.changeCSS('/static/' + variant.PieceCSS[idx] + '.css');
        }
        ;
    });
    return [h_1.default('aside.sidebar-first'),
        h_1.default('main.main', [
            h_1.default('player-head', [
                model["profileid"],
                h_1.default('a.i-dl', {
                    attrs: { href: '/games/export/' + model["profileid"], "download": model["profileid"] + '.pgn' },
                    class: { "icon": true, "icon-download": true }
                }),
                h_1.default('a.i-tv', {
                    attrs: { href: '/@/' + model["profileid"] + '/tv' },
                    class: { "icon": true, "icon-tv": true }
                }),
            ]),
            h_1.default('table#games'),
            h_1.default('div#sentinel', { hook: { insert: (vnode) => observeSentinel(vnode, model) } })
        ]),
        h_1.default('aside.sidebar-second'),
    ];
}
exports.profileView = profileView;

},{"./chess":35,"./clock":36,"./settings":49,"./user":51,"chessgroundx":4,"snabbdom":26,"snabbdom/h":19,"snabbdom/modules/attributes":22,"snabbdom/modules/class":23,"snabbdom/modules/eventlisteners":24,"snabbdom/modules/props":25}],45:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const class_1 = __importDefault(require("snabbdom/modules/class"));
const attributes_1 = __importDefault(require("snabbdom/modules/attributes"));
const eventlisteners_1 = __importDefault(require("snabbdom/modules/eventlisteners"));
const tovnode_1 = __importDefault(require("snabbdom/tovnode"));
const util_1 = require("chessgroundx/util");
const chess_1 = require("./chess");
const patch = snabbdom_1.init([class_1.default, attributes_1.default, eventlisteners_1.default]);
function default_1(ctrl) {
    let promoting = false;
    let roles = [];
    function start(orig, dest, meta) {
        const ground = ctrl.getGround();
        if (chess_1.isPromotion(ctrl.variant, ground.state.pieces[dest], orig, dest, meta, ctrl.promotions)) {
            const color = ctrl.mycolor;
            const orientation = ground.state.orientation;
            const movingRole = ground.state.pieces[dest].role;
            roles = chess_1.promotionRoles(ctrl.variant, movingRole, orig, dest, ctrl.promotions);
            switch (ctrl.variant) {
                // TODO: in grand chess use mandatoryPromotion when promotion happens on back rank
                case "shogi":
                    if (chess_1.mandatoryPromotion(movingRole, dest, color)) {
                        promote(ground, dest, 'p' + ground.state.pieces[dest].role);
                        ctrl.sendMove(orig, dest, '+');
                    }
                    else {
                        draw_promo(dest, color, orientation);
                        promoting = {
                            orig: orig,
                            dest: dest,
                            callback: ctrl.sendMove,
                        };
                    }
                    ;
                    break;
                case 'makruk':
                    promote(ground, dest, 'met');
                    ctrl.sendMove(orig, dest, 'm');
                    break;
                case 'sittuyin':
                    promote(ground, dest, 'ferz');
                    ctrl.sendMove(orig, dest, 'f');
                    break;
                default:
                    // in grand chess promotion on back rank is mandatory
                    // and sometimes only one choice exists
                    if (roles.length === 1) {
                        const role = roles[0];
                        const promo = chess_1.roleToSan[role].toLowerCase();
                        promote(ground, dest, role);
                        ctrl.sendMove(orig, dest, promo);
                    }
                    else {
                        draw_promo(dest, color, orientation);
                        promoting = {
                            orig: orig,
                            dest: dest,
                            callback: ctrl.sendMove,
                        };
                    }
                    ;
            }
            ;
            return true;
        }
        return false;
    }
    ;
    function promote(g, key, role) {
        var pieces = {};
        var piece = g.state.pieces[key];
        if (g.state.pieces[key].role === role) {
            return false;
        }
        else {
            pieces[key] = {
                color: piece.color,
                role: role,
                promoted: true
            };
            g.setPieces(pieces);
            return true;
        }
    }
    function draw_promo(dest, color, orientation) {
        var container = tovnode_1.default(document.querySelector('extension'));
        patch(container, renderPromotion(dest, color, orientation));
    }
    function draw_no_promo() {
        var container = document.getElementById('extension_choice');
        patch(container, snabbdom_1.h('extension'));
    }
    function finish(role) {
        if (promoting) {
            draw_no_promo();
            const promoted = promote(ctrl.getGround(), promoting.dest, role);
            let promo;
            switch (ctrl.variant) {
                case "shogi":
                    promo = promoted ? "+" : "";
                    break;
                case "grandhouse":
                case "grand":
                    promo = promoted ? chess_1.roleToSan[role].toLowerCase() : "";
                    break;
                default:
                    promo = chess_1.roleToSan[role].toLowerCase();
            }
            ;
            if (promoting.callback)
                promoting.callback(promoting.orig, promoting.dest, promo);
            promoting = false;
        }
    }
    ;
    function cancel() {
        draw_no_promo();
        ctrl.goPly(ctrl.ply);
        return;
    }
    function bind(eventName, f, redraw) {
        return {
            insert(vnode) {
                vnode.elm.addEventListener(eventName, e => {
                    const res = f(e);
                    if (redraw)
                        redraw();
                    return res;
                });
            }
        };
    }
    function renderPromotion(dest, color, orientation) {
        const dim = ctrl.getGround().state.dimensions;
        const firstRankIs0 = dim.height === 10;
        var left = (dim.width - util_1.key2pos(dest, firstRankIs0)[0]) * (100 / dim.width);
        if (orientation === "white")
            left = (100 / dim.width) * (dim.width - 1) - left;
        var vertical = color === orientation ? "top" : "bottom";
        return snabbdom_1.h("div#extension_choice." + vertical, {
            hook: {
                insert: vnode => {
                    const el = vnode.elm;
                    el.addEventListener("click", () => cancel());
                    el.addEventListener("contextmenu", e => {
                        e.preventDefault();
                        return false;
                    });
                }
            }
        }, roles.map((serverRole, i) => {
            var top = (color === orientation ? i : dim.height - 1 - i) * (100 / dim.height);
            return snabbdom_1.h("square", {
                attrs: { style: "top: " + top + "%;left: " + left + "%" },
                hook: bind("click", e => {
                    e.stopPropagation();
                    finish(serverRole);
                }, false)
            }, [snabbdom_1.h("piece." + serverRole + "." + color)]);
        }));
    }
    return {
        start,
    };
}
exports.default = default_1;

},{"./chess":35,"chessgroundx/util":17,"snabbdom":26,"snabbdom/modules/attributes":22,"snabbdom/modules/class":23,"snabbdom/modules/eventlisteners":24,"snabbdom/tovnode":28}],46:[function(require,module,exports){
"use strict";
// http://jsfiddle.net/MissoulaLorenzo/gfn6ob3j/
// https://github.com/ornicar/lila/blob/master/ui/common/src/resize.ts
Object.defineProperty(exports, "__esModule", { value: true });
//export default function resizeHandle(els: cg.Elements, pref: number, ply: number) {
function resizeHandle(els) {
    //  if (!pref) return;
    if (true)
        return;
    const el = document.createElement('cg-resize');
    els.container.appendChild(el);
    const mousemoveEvent = 'mousemove';
    const mouseupEvent = 'mouseup';
    el.addEventListener('mousedown', (start) => {
        start.preventDefault();
        const startPos = eventPosition(start);
        const initialZoom = 100; //parseInt(getComputedStyle(document.body).getPropertyValue('--zoom'));
        let zoom = initialZoom;
        /*
            const saveZoom = window.lichess.debounce(() => {
              $.ajax({ method: 'post', url: '/pref/zoom?v=' + (100 + zoom) });
            }, 700);
        */
        const setZoom = (zoom) => {
            const el = document.querySelector('.cg-wrap');
            if (el) {
                //            const baseWidth = dimensions[VARIANTS[this.variant].geom].width * (this.variant === "shogi" ? 52 : 64);
                //            const baseHeight = dimensions[VARIANTS[this.variant].geom].height * (this.variant === "shogi" ? 60 : 64);
                const baseWidth = parseInt(document.defaultView.getComputedStyle(el).width || '', 10);
                const baseHeight = parseInt(document.defaultView.getComputedStyle(el).height || '', 10);
                console.log(baseWidth, baseHeight, zoom);
                const pxw = `${zoom / 100 * baseWidth}px`;
                const pxh = `${zoom / 100 * baseHeight}px`;
                el.style.width = pxw;
                el.style.height = pxh;
                const ev = document.createEvent('Event');
                ev.initEvent('chessground.resize', false, false);
                document.body.dispatchEvent(ev);
            }
        };
        const resize = (move) => {
            const pos = eventPosition(move);
            const delta = pos[0] - startPos[0] + pos[1] - startPos[1];
            zoom = Math.round(Math.min(150, Math.max(0, initialZoom + delta / 10)));
            //      document.body.setAttribute('style', '--zoom:' + zoom);
            //      window.lichess.dispatchEvent(window, 'resize');
            setZoom(zoom);
            //      saveZoom();
        };
        document.body.classList.add('resizing');
        document.addEventListener(mousemoveEvent, resize);
        document.addEventListener(mouseupEvent, () => {
            document.removeEventListener(mousemoveEvent, resize);
            document.body.classList.remove('resizing');
        }, { once: true });
    });
    /*
      if (pref == 1) {
        const toggle = (ply: number) => el.classList.toggle('none', ply >= 2);
        toggle(ply);
        window.lichess.pubsub.on('ply', toggle);
      }
    
      addNag(el);
    */
}
exports.default = resizeHandle;
function eventPosition(e) {
    if (e.clientX || e.clientX === 0)
        return [e.clientX, e.clientY];
    if (e.touches && e.targetTouches[0])
        return [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
    return undefined;
}
/*
function addNag(el: HTMLElement) {

  const storage = window.lichess.storage.makeBoolean('resize-nag');
  if (storage.get()) return;

  window.lichess.loadCssPath('nag-circle');
  el.title = 'Drag to resize';
  el.innerHTML = '<div class="nag-circle"></div>';
  el.addEventListener(window.lichess.mousedownEvent, () => {
    storage.set(true);
    el.innerHTML = '';
  }, { once: true });

  setTimeout(() => storage.set(true), 15000);
}
*/ 

},{}],47:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const roundCtrl_1 = __importDefault(require("./roundCtrl"));
const chess_1 = require("./chess");
const clock_1 = require("./clock");
function runGround(vnode, model) {
    const el = vnode.elm;
    const ctrl = new roundCtrl_1.default(el, model);
    const cg = ctrl.chessground;
    window['cg'] = cg;
}
function roundView(model) {
    console.log("roundView model=", model);
    const dataIcon = chess_1.VARIANTS[model["variant"]].icon;
    clock_1.renderTimeago();
    return [snabbdom_1.h('aside.sidebar-first', [
            snabbdom_1.h('div.game-info', [
                snabbdom_1.h('div.info0', { attrs: { "data-icon": dataIcon }, class: { "icon": true } }, [
                    snabbdom_1.h('div.info1', { attrs: { "data-icon": (model["chess960"] === 'True') ? "V" : "" }, class: { "icon": true } }),
                    snabbdom_1.h('div.info2', [
                        snabbdom_1.h('div.tc', model["base"] + "+" + model["inc"] + " • Casual • " + model["variant"]),
                        Number(model["status"]) >= 0 ? snabbdom_1.h('info-date', { attrs: { timestamp: model["date"] } }, clock_1.timeago(model["date"])) : "Playing right now",
                    ]),
                ]),
                snabbdom_1.h('div.player-data', [
                    snabbdom_1.h('i-side.online', { class: { "icon": true, "icon-white": true } }),
                    snabbdom_1.h('player', [
                        snabbdom_1.h('a.user-link', { attrs: { href: '/@/' + model["wplayer"] } }, [
                            snabbdom_1.h('player-title', " " + model["wtitle"] + " "),
                            model["wplayer"] + " (1500?)",
                        ]),
                    ]),
                ]),
                snabbdom_1.h('div.player-data', [
                    snabbdom_1.h('i-side.online', { class: { "icon": true, "icon-black": true } }),
                    snabbdom_1.h('player', [
                        snabbdom_1.h('a.user-link', { attrs: { href: '/@/' + model["bplayer"] } }, [
                            snabbdom_1.h('player-title', " " + model["btitle"] + " "),
                            model["bplayer"] + " (1500?)",
                        ]),
                    ]),
                ]),
            ]),
            snabbdom_1.h('div.roundchat#roundchat'),
        ]),
        snabbdom_1.h('main.main', [
            snabbdom_1.h('selection.' + chess_1.VARIANTS[model["variant"]].board + '.' + chess_1.VARIANTS[model["variant"]].pieces, [
                snabbdom_1.h('div.cg-wrap.' + chess_1.VARIANTS[model["variant"]].cg, { hook: { insert: (vnode) => runGround(vnode, model) },
                }),
            ]),
        ]),
        snabbdom_1.h('aside.sidebar-second', [
            snabbdom_1.h('div#pocket-wrapper', [
                snabbdom_1.h('div.' + chess_1.VARIANTS[model["variant"]].pieces + '.' + model["variant"], [
                    snabbdom_1.h('div.cg-wrap.pocket', [
                        snabbdom_1.h('div#pocket0'),
                    ]),
                ]),
            ]),
            snabbdom_1.h('div#clock0'),
            snabbdom_1.h('div.round-data', [
                snabbdom_1.h('round-player#rplayer0'),
                snabbdom_1.h('div#move-controls'),
                snabbdom_1.h('div#board-settings'),
                snabbdom_1.h('div#movelist-block', [
                    snabbdom_1.h('div#movelist'),
                ]),
                snabbdom_1.h('div#game-controls'),
                snabbdom_1.h('round-player#rplayer1'),
            ]),
            snabbdom_1.h('div#clock1'),
            snabbdom_1.h('div#pocket-wrapper', [
                snabbdom_1.h('div.' + chess_1.VARIANTS[model["variant"]].pieces + '.' + model["variant"], [
                    snabbdom_1.h('div.cg-wrap.pocket', [
                        snabbdom_1.h('div#pocket1'),
                    ]),
                ]),
            ]),
            snabbdom_1.h('div#flip'),
        ]),
        snabbdom_1.h('under-left', "Spectators"),
        snabbdom_1.h('under-board'),
    ];
}
exports.roundView = roundView;

},{"./chess":35,"./clock":36,"./roundCtrl":48,"snabbdom":26}],48:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sockette_1 = __importDefault(require("sockette"));
const snabbdom_1 = require("snabbdom");
const h_1 = require("snabbdom/h");
const class_1 = __importDefault(require("snabbdom/modules/class"));
const attributes_1 = __importDefault(require("snabbdom/modules/attributes"));
const props_1 = __importDefault(require("snabbdom/modules/props"));
const eventlisteners_1 = __importDefault(require("snabbdom/modules/eventlisteners"));
const util_1 = require("chessgroundx/util");
const chessgroundx_1 = require("chessgroundx");
const clock_1 = require("./clock");
const gating_1 = __importDefault(require("./gating"));
const promotion_1 = __importDefault(require("./promotion"));
const pocket_1 = require("./pocket");
const sound_1 = require("./sound");
const chess_1 = require("./chess");
const user_1 = require("./user");
const chat_1 = require("./chat");
const settings_1 = require("./settings");
const movelist_1 = require("./movelist");
const resize_1 = __importDefault(require("./resize"));
const profile_1 = require("./profile");
const player_1 = require("./player");
const patch = snabbdom_1.init([class_1.default, attributes_1.default, props_1.default, eventlisteners_1.default]);
class RoundController {
    constructor(el, model) {
        this.getGround = () => this.chessground;
        this.getDests = () => this.dests;
        this.onMsgGameStart = (msg) => {
            // console.log("got gameStart msg:", msg);
            if (msg.gameId !== this.model["gameId"])
                return;
            if (!this.spectator)
                sound_1.sound.genericNotify();
        };
        this.onMsgNewGame = (msg) => {
            window.location.assign(this.model["home"] + '/' + msg["gameId"]);
        };
        this.rematch = () => {
            this.doSend({ type: "rematch", gameId: this.model["gameId"] });
        };
        this.newOpponent = (home) => {
            window.location.assign(home);
        };
        this.analysis = (home) => {
            window.location.assign(home + '/' + this.model["gameId"]);
        };
        this.gameOver = () => {
            console.log('gameOver()', profile_1.result(this.status, this.result));
            //var container = document.getElementById('result') as HTMLElement;
            //patch(container, h('div#result', result(this.status, this.result)));
            //const movelist = document.getElementById('movelist') as HTMLElement;
            var container = document.getElementById('moves');
            patch(container, h_1.h('div#moves', [h_1.h('div#result', profile_1.result(this.status, this.result))]));
            if (!this.spectator) {
                this.gameControls = patch(this.gameControls, h_1.h('div'));
                patch(this.gameControls, h_1.h('div#after-game-controls', [
                    h_1.h('button.rematch', { on: { click: () => this.rematch() } }, "REMATCH"),
                    h_1.h('button.newopp', { on: { click: () => this.newOpponent(this.model["home"]) } }, "NEW OPPONENT"),
                    h_1.h('button.analysis', { on: { click: () => this.analysis(this.model["home"]) } }, "ANALYSIS BOARD"),
                ]));
            }
        };
        this.checkStatus = (msg) => {
            if (msg.gameId !== this.model["gameId"])
                return;
            if (msg.status >= 0 && this.result === "") {
                this.clocks[0].pause(false);
                this.clocks[1].pause(false);
                this.result = msg.result;
                this.status = msg.status;
                switch (msg.result) {
                    case "1/2-1/2":
                        sound_1.sound.draw();
                        break;
                    case "1-0":
                        if (!this.spectator) {
                            if (this.mycolor === "white") {
                                sound_1.sound.victory();
                            }
                            else {
                                sound_1.sound.defeat();
                            }
                        }
                        break;
                    case "0-1":
                        if (!this.spectator) {
                            if (this.mycolor === "black") {
                                sound_1.sound.victory();
                            }
                            else {
                                sound_1.sound.defeat();
                            }
                        }
                        break;
                    // ABORTED
                    default:
                        break;
                }
                this.gameOver();
                movelist_1.selectMove(this, this.ply);
                // clean up gating/promotion widget left over the ground while game ended by time out
                var container = document.getElementById('extension_choice');
                if (container instanceof Element)
                    patch(container, h_1.h('extension'));
                if (this.tv) {
                    setInterval(() => { this.doSend({ type: "updateTV", gameId: this.model["gameId"], profileId: this.model["profileid"] }); }, 2000);
                }
            }
        };
        this.onMsgUpdateTV = (msg) => {
            if (msg.gameId !== this.model["gameId"]) {
                window.location.assign(this.model["home"] + '/tv');
            }
        };
        this.onMsgBoard = (msg) => {
            if (msg.gameId !== this.model["gameId"])
                return;
            // console.log("got board msg:", msg);
            this.ply = msg.ply;
            this.fullfen = msg.fen;
            this.dests = msg.dests;
            // list of legal promotion moves
            this.promotions = msg.promo;
            const clocks = msg.clocks;
            const parts = msg.fen.split(" ");
            this.turnColor = parts[1] === "w" ? "white" : "black";
            if (msg.steps.length > 1) {
                this.steps = [];
                var container = document.getElementById('movelist');
                patch(container, h_1.h('div#movelist'));
                msg.steps.forEach((step) => {
                    this.steps.push(step);
                    movelist_1.updateMovelist(this);
                });
            }
            else {
                if (msg.ply === this.steps.length) {
                    const step = {
                        'fen': msg.fen,
                        'move': msg.lastMove,
                        'check': msg.check,
                        'turnColor': this.turnColor,
                        'san': msg.steps[0].san,
                    };
                    this.steps.push(step);
                    movelist_1.updateMovelist(this);
                }
            }
            this.abortable = Number(parts[parts.length - 1]) <= 1;
            if (!this.spectator && !this.abortable && this.result === "") {
                var container = document.getElementById('abort');
                patch(container, h_1.h('button#abort', { props: { disabled: true } }));
            }
            var lastMove = msg.lastMove;
            if (lastMove !== null) {
                if (this.variant === "shogi") {
                    lastMove = chess_1.usi2uci(lastMove);
                }
                else if (this.variant === "grand" || this.variant === "grandhouse") {
                    lastMove = chess_1.grand2zero(lastMove);
                }
                lastMove = [lastMove.slice(0, 2), lastMove.slice(2, 4)];
            }
            // drop lastMove causing scrollbar flicker,
            // so we remove from part to avoid that
            if (lastMove !== null && lastMove[0][1] === '@')
                lastMove = [lastMove[1]];
            // save capture state before updating chessground
            const capture = lastMove !== null && this.chessground.state.pieces[lastMove[1]];
            if (lastMove !== null && (this.turnColor === this.mycolor || this.spectator)) {
                if (this.variant === "shogi") {
                    sound_1.sound.shogimove();
                }
                else {
                    if (capture) {
                        sound_1.sound.capture();
                    }
                    else {
                        sound_1.sound.move();
                    }
                }
            }
            else {
                lastMove = [];
            }
            this.checkStatus(msg);
            if (msg.check) {
                sound_1.sound.check();
            }
            const oppclock = !this.flip ? 0 : 1;
            const myclock = 1 - oppclock;
            if (this.spectator) {
                this.chessground.set({
                    fen: parts[0],
                    turnColor: this.turnColor,
                    check: msg.check,
                    lastMove: lastMove,
                });
                pocket_1.updatePockets(this, this.vpocket0, this.vpocket1);
                this.clocks[0].pause(false);
                this.clocks[1].pause(false);
                this.clocks[oppclock].setTime(clocks[this.oppcolor]);
                this.clocks[myclock].setTime(clocks[this.mycolor]);
                if (!this.abortable && msg.status < 0) {
                    if (this.turnColor === this.mycolor) {
                        this.clocks[myclock].start();
                    }
                    else {
                        this.clocks[oppclock].start();
                    }
                }
            }
            else {
                if (this.turnColor === this.mycolor) {
                    this.chessground.set({
                        fen: parts[0],
                        turnColor: this.turnColor,
                        movable: {
                            free: false,
                            color: this.mycolor,
                            dests: msg.dests,
                        },
                        check: msg.check,
                        lastMove: lastMove,
                    });
                    pocket_1.updatePockets(this, this.vpocket0, this.vpocket1);
                    this.clocks[oppclock].pause(false);
                    this.clocks[oppclock].setTime(clocks[this.oppcolor]);
                    this.clocks[myclock].setTime(clocks[this.mycolor]);
                    if (!this.abortable && msg.status < 0) {
                        this.clocks[myclock].start(clocks[this.mycolor]);
                        console.log('MY CLOCK STARTED');
                    }
                    // console.log("trying to play premove....");
                    if (this.premove)
                        this.performPremove();
                    if (this.predrop)
                        this.performPredrop();
                }
                else {
                    this.chessground.set({
                        // giving fen here will place castling rooks to their destination in chess960 variants
                        fen: parts[0],
                        turnColor: this.turnColor,
                        premovable: {
                            dests: msg.dests,
                        },
                        check: msg.check,
                    });
                    this.clocks[myclock].pause(false);
                    this.clocks[myclock].setTime(clocks[this.mycolor]);
                    this.clocks[oppclock].setTime(clocks[this.oppcolor]);
                    if (!this.abortable && msg.status < 0) {
                        this.clocks[oppclock].start(clocks[this.oppcolor]);
                        console.log('OPP CLOCK  STARTED');
                    }
                    if (this.oppIsRandomMover && msg.rm !== "") {
                        this.doSend({ type: "move", gameId: this.model["gameId"], move: msg.rm, clocks: clocks });
                    }
                    ;
                }
                ;
            }
            ;
        };
        this.goPly = (ply) => {
            const step = this.steps[ply];
            var move = step['move'];
            var capture = false;
            if (move !== undefined) {
                if (this.variant === "shogi")
                    move = chess_1.usi2uci(move);
                if (this.variant === "grand" || this.variant === "grandhouse")
                    move = chess_1.grand2zero(move);
                move = move.slice(1, 2) === '@' ? [move.slice(2, 4)] : [move.slice(0, 2), move.slice(2, 4)];
                capture = this.chessground.state.pieces[move[move.length - 1]] !== undefined;
            }
            this.chessground.set({
                fen: step.fen,
                turnColor: step.turnColor,
                movable: {
                    free: false,
                    color: this.spectator ? undefined : step.turnColor,
                    dests: this.result === "" && ply === this.steps.length - 1 ? this.dests : undefined,
                },
                check: step.check,
                lastMove: move,
            });
            this.fullfen = step.fen;
            pocket_1.updatePockets(this, this.vpocket0, this.vpocket1);
            if (ply === this.ply + 1) {
                if (this.variant === "shogi") {
                    sound_1.sound.shogimove();
                }
                else {
                    if (capture) {
                        sound_1.sound.capture();
                    }
                    else {
                        sound_1.sound.move();
                    }
                }
            }
            this.ply = ply;
        };
        this.doSend = (message) => {
            console.log("---> doSend():", message);
            this.sock.send(JSON.stringify(message));
        };
        this.sendMove = (orig, dest, promo) => {
            // pause() will add increment!
            const oppclock = !this.flip ? 0 : 1;
            const myclock = 1 - oppclock;
            const movetime = (this.clocks[myclock].running) ? Date.now() - this.clocks[myclock].startTime : 0;
            this.clocks[myclock].pause((this.base === 0 && this.ply < 2) ? false : true);
            // console.log("sendMove(orig, dest, prom)", orig, dest, promo);
            const uci_move = orig + dest + promo;
            const move = this.variant === "shogi" ? chess_1.uci2usi(uci_move) : (this.variant === "grand" || this.variant === "grandhouse") ? chess_1.zero2grand(uci_move) : uci_move;
            // console.log("sendMove(move)", move);
            // TODO: if premoved, send 0 time
            let bclock, clocks;
            if (!this.flip) {
                bclock = this.mycolor === "black" ? 1 : 0;
            }
            else {
                bclock = this.mycolor === "black" ? 0 : 1;
            }
            const wclock = 1 - bclock;
            clocks = { movetime: movetime, black: this.clocks[bclock].duration, white: this.clocks[wclock].duration };
            this.doSend({ type: "move", gameId: this.model["gameId"], move: move, clocks: clocks });
            if (!this.abortable)
                this.clocks[oppclock].start();
        };
        this.onMove = () => {
            return (orig, dest, capturedPiece) => {
                console.log("   ground.onMove()", orig, dest, capturedPiece);
                if (this.variant === "shogi") {
                    sound_1.sound.shogimove();
                }
                else {
                    if (capturedPiece) {
                        sound_1.sound.capture();
                    }
                    else {
                        sound_1.sound.move();
                    }
                }
            };
        };
        this.onDrop = () => {
            return (piece, dest) => {
                console.log("ground.onDrop()", piece, dest);
                if (dest != 'z0' && piece.role && pocket_1.dropIsValid(this.dests, piece.role, dest)) {
                    if (this.variant === "shogi") {
                        sound_1.sound.shogimove();
                    }
                    else {
                        sound_1.sound.move();
                    }
                }
                else {
                    this.clickDrop = piece;
                }
            };
        };
        this.setPremove = (orig, dest, meta) => {
            this.premove = { orig, dest, meta };
            // console.log("setPremove() to:", orig, dest, meta);
        };
        this.unsetPremove = () => {
            this.premove = null;
        };
        this.setPredrop = (role, key) => {
            this.predrop = { role, key };
            // console.log("setPredrop() to:", role, key);
        };
        this.unsetPredrop = () => {
            this.predrop = null;
        };
        this.performPremove = () => {
            const { orig, dest, meta } = this.premove;
            // TODO: promotion?
            console.log("performPremove()", orig, dest, meta);
            this.chessground.playPremove();
            this.premove = null;
        };
        this.performPredrop = () => {
            const { role, key } = this.predrop;
            console.log("performPredrop()", role, key);
            this.chessground.playPredrop(drop => { return pocket_1.dropIsValid(this.dests, drop.role, drop.key); });
            this.predrop = null;
        };
        this.onUserMove = (orig, dest, meta) => {
            // chessground doesn't knows about ep, so we have to remove ep captured pawn
            const pieces = this.chessground.state.pieces;
            const geom = this.chessground.state.geometry;
            // console.log("ground.onUserMove()", orig, dest, meta, pieces);
            const moved = pieces[dest];
            const firstRankIs0 = this.chessground.state.dimensions.height === 10;
            if (meta.captured === undefined && moved.role === "pawn" && orig[0] != dest[0] && chess_1.hasEp(this.variant)) {
                const pos = util_1.key2pos(dest, firstRankIs0), pawnPos = [pos[0], pos[1] + (this.mycolor === 'white' ? -1 : 1)];
                const diff = {};
                diff[util_1.pos2key(pawnPos, geom)] = undefined;
                this.chessground.setPieces(diff);
                meta.captured = { role: "pawn" };
            }
            ;
            // increase pocket count
            if ((this.variant === "crazyhouse" || this.variant === "capahouse" || this.variant === "shouse" || this.variant === "grandhouse" || this.variant === "shogi") && meta.captured) {
                var role = meta.captured.role;
                if (meta.captured.promoted)
                    role = this.variant === "shogi" ? meta.captured.role.slice(1) : "pawn";
                if (this.flip) {
                    this.pockets[0][role]++;
                    this.vpocket0 = patch(this.vpocket0, pocket_1.pocketView(this, this.mycolor, "top"));
                }
                else {
                    this.pockets[1][role]++;
                    this.vpocket1 = patch(this.vpocket1, pocket_1.pocketView(this, this.mycolor, "bottom"));
                }
            }
            ;
            //  gating elephant/hawk
            if (this.variant === "seirawan" || this.variant === "shouse") {
                if (!this.promotion.start(orig, dest, meta) && !this.gating.start(this.fullfen, orig, dest, meta))
                    this.sendMove(orig, dest, '');
            }
            else {
                if (!this.promotion.start(orig, dest, meta))
                    this.sendMove(orig, dest, '');
            }
            ;
        };
        this.onUserDrop = (role, dest) => {
            // console.log("ground.onUserDrop()", role, dest);
            // decrease pocket count
            //cancelDropMode(this.chessground.state);
            if (pocket_1.dropIsValid(this.dests, role, dest)) {
                if (this.flip) {
                    this.pockets[0][role]--;
                    this.vpocket0 = patch(this.vpocket0, pocket_1.pocketView(this, this.mycolor, "top"));
                }
                else {
                    this.pockets[1][role]--;
                    this.vpocket1 = patch(this.vpocket1, pocket_1.pocketView(this, this.mycolor, "bottom"));
                }
                this.sendMove(chess_1.roleToSan[role] + "@", dest, '');
                // console.log("sent move", move);
            }
            else {
                console.log("!!! invalid move !!!", role, dest);
                // restore board
                this.clickDrop = undefined;
                this.chessground.set({
                    fen: this.fullfen,
                    lastMove: this.lastmove,
                    turnColor: this.mycolor,
                    movable: {
                        dests: this.dests,
                        showDests: true,
                    },
                });
            }
        };
        this.onSelect = (selected) => {
            return (key) => {
                console.log("ground.onSelect()", key, selected, this.clickDrop, this.chessground.state);
                // If drop selection was set dropDests we have to restore dests here
                if (this.chessground.state.movable.dests === undefined)
                    return;
                if (key != 'z0' && 'z0' in this.chessground.state.movable.dests) {
                    if (this.clickDrop !== undefined && pocket_1.dropIsValid(this.dests, this.clickDrop.role, key)) {
                        this.chessground.newPiece(this.clickDrop, key);
                        this.onUserDrop(this.clickDrop.role, key);
                    }
                    this.clickDrop = undefined;
                    //cancelDropMode(this.chessground.state);
                    this.chessground.set({ movable: { dests: this.dests } });
                }
                ;
                // Sittuyin in place promotion on Ctrl+click
                if (this.chessground.state.stats.ctrlKey &&
                    (key in this.chessground.state.movable.dests) &&
                    (this.chessground.state.movable.dests[key].indexOf(key) >= 0) &&
                    (this.variant === 'sittuyin')) {
                    console.log("Ctrl in place promotion", key);
                    var pieces = {};
                    var piece = this.chessground.state.pieces[key];
                    pieces[key] = {
                        color: piece.color,
                        role: 'ferz',
                        promoted: true
                    };
                    this.chessground.setPieces(pieces);
                    this.sendMove(key, key, 'f');
                }
                ;
            };
        };
        this.onMsgUserConnected = (msg) => {
            this.model["username"] = msg["username"];
            user_1.renderUsername(this.model["home"], this.model["username"]);
            if (this.spectator) {
                this.doSend({ type: "is_user_online", username: this.wplayer });
                this.doSend({ type: "is_user_online", username: this.bplayer });
                // we want to know lastMove and check status
                this.doSend({ type: "board", gameId: this.model["gameId"] });
            }
            else {
                const opp_name = this.model["username"] === this.wplayer ? this.bplayer : this.wplayer;
                this.doSend({ type: "is_user_online", username: opp_name });
                var container = document.getElementById('player1');
                patch(container, h_1.h('i-side.online#player1', { class: { "icon": true, "icon-online": true, "icon-offline": false } }));
                // prevent sending gameStart message when user just reconecting
                if (msg.ply === 0) {
                    this.doSend({ type: "ready", gameId: this.model["gameId"] });
                }
                this.doSend({ type: "board", gameId: this.model["gameId"] });
            }
        };
        this.onMsgUserOnline = (msg) => {
            console.log(msg);
            if (msg.username === this.players[0]) {
                var container = document.getElementById('player0');
                patch(container, h_1.h('i-side.online#player0', { class: { "icon": true, "icon-online": true, "icon-offline": false } }));
            }
            else {
                var container = document.getElementById('player1');
                patch(container, h_1.h('i-side.online#player1', { class: { "icon": true, "icon-online": true, "icon-offline": false } }));
            }
        };
        this.onMsgUserDisconnected = (msg) => {
            console.log(msg);
            if (msg.username === this.players[0]) {
                var container = document.getElementById('player0');
                patch(container, h_1.h('i-side.online#player0', { class: { "icon": true, "icon-online": false, "icon-offline": true } }));
            }
            else {
                var container = document.getElementById('player1');
                patch(container, h_1.h('i-side.online#player1', { class: { "icon": true, "icon-online": false, "icon-offline": true } }));
            }
        };
        this.onMsgChat = (msg) => {
            if (msg.user !== this.model["username"])
                chat_1.chatMessage(msg.user, msg.message, "roundchat");
        };
        this.onMsgMoreTime = () => {
            chat_1.chatMessage('', this.mycolor + ' +15 seconds', "roundchat");
            this.clocks[1].setTime(this.clocks[1].duration + 15 * 1000);
        };
        this.onMsgOffer = (msg) => {
            chat_1.chatMessage("", msg.message, "roundchat");
        };
        this.onMessage = (evt) => {
            console.log("<+++ onMessage():", evt.data);
            var msg = JSON.parse(evt.data);
            switch (msg.type) {
                case "board":
                    this.onMsgBoard(msg);
                    break;
                case "gameEnd":
                    this.checkStatus(msg);
                    break;
                case "gameStart":
                    this.onMsgGameStart(msg);
                    break;
                case "game_user_connected":
                    this.onMsgUserConnected(msg);
                    break;
                case "user_online":
                    this.onMsgUserOnline(msg);
                    break;
                case "user_disconnected":
                    this.onMsgUserDisconnected(msg);
                    break;
                case "roundchat":
                    this.onMsgChat(msg);
                    break;
                case "new_game":
                    this.onMsgNewGame(msg);
                    break;
                case "offer":
                    this.onMsgOffer(msg);
                    break;
                case "moretime":
                    this.onMsgMoreTime();
                    break;
                case "updateTV":
                    this.onMsgUpdateTV(msg);
                    break;
            }
        };
        const onOpen = (evt) => {
            console.log("ctrl.onOpen()", evt);
            this.clocks[0].connecting = false;
            this.clocks[1].connecting = false;
            this.doSend({ type: "game_user_connected", username: this.model["username"], gameId: this.model["gameId"] });
        };
        const opts = {
            maxAttempts: 10,
            onopen: e => onOpen(e),
            onmessage: e => this.onMessage(e),
            onreconnect: e => {
                this.clocks[0].connecting = true;
                this.clocks[1].connecting = true;
                console.log('Reconnecting in round...', e);
                var container = document.getElementById('player1');
                patch(container, h_1.h('i-side.online#player1', { class: { "icon": true, "icon-online": false, "icon-offline": true } }));
            },
            onmaximum: e => console.log('Stop Attempting!', e),
            onclose: e => console.log('Closed!', e),
            onerror: e => console.log('Error:', e),
        };
        try {
            this.sock = new sockette_1.default("ws://" + location.host + "/wsr", opts);
        }
        catch (err) {
            this.sock = new sockette_1.default("wss://" + location.host + "/wsr", opts);
        }
        this.model = model;
        this.variant = model["variant"];
        this.fullfen = model["fen"];
        this.wplayer = model["wplayer"];
        this.bplayer = model["bplayer"];
        this.base = model["base"];
        this.inc = model["inc"];
        this.status = model["status"];
        this.tv = model["tv"];
        this.steps = [];
        this.pgn = "";
        this.ply = 0;
        this.flip = false;
        this.settings = true;
        this.CSSindexesB = chess_1.variants.map((variant) => localStorage[variant + "_board"] === undefined ? 0 : Number(localStorage[variant + "_board"]));
        this.CSSindexesP = chess_1.variants.map((variant) => localStorage[variant + "_pieces"] === undefined ? 0 : Number(localStorage[variant + "_pieces"]));
        this.spectator = this.model["username"] !== this.wplayer && this.model["username"] !== this.bplayer;
        // orientation = this.mycolor
        if (this.spectator) {
            this.mycolor = this.variant === 'shogi' ? 'black' : 'white';
            this.oppcolor = this.variant === 'shogi' ? 'white' : 'black';
        }
        else {
            this.mycolor = this.model["username"] === this.wplayer ? 'white' : 'black';
            this.oppcolor = this.model["username"] === this.wplayer ? 'black' : 'white';
        }
        this.oppIsRandomMover = ((this.mycolor === "white" && this.bplayer === "Random-Mover") ||
            (this.mycolor === "black" && this.wplayer === "Random-Mover"));
        // players[0] is top player, players[1] is bottom player
        this.players = [
            this.mycolor === "white" ? this.bplayer : this.wplayer,
            this.mycolor === "white" ? this.wplayer : this.bplayer
        ];
        this.titles = [
            this.mycolor === "white" ? this.model['btitle'] : this.model['wtitle'],
            this.mycolor === "white" ? this.model['wtitle'] : this.model['btitle']
        ];
        this.premove = null;
        this.predrop = null;
        this.result = "";
        const parts = this.fullfen.split(" ");
        this.abortable = Number(parts[parts.length - 1]) <= 1;
        const fen_placement = parts[0];
        this.turnColor = parts[1] === "w" ? "white" : "black";
        this.steps.push({
            'fen': fen_placement,
            'move': undefined,
            'check': false,
            'turnColor': this.turnColor,
        });
        this.chessground = chessgroundx_1.Chessground(el, {
            fen: fen_placement,
            geometry: chess_1.VARIANTS[this.variant].geom,
            orientation: this.mycolor,
            turnColor: this.turnColor,
            animation: {
                enabled: true,
            },
            events: {
                insert(elements) { resize_1.default(elements); }
            }
        });
        if (this.spectator) {
            this.chessground.set({
                viewOnly: true,
                events: {
                    move: this.onMove(),
                }
            });
        }
        else {
            this.chessground.set({
                movable: {
                    free: false,
                    color: this.mycolor,
                    showDests: true,
                    events: {
                        after: this.onUserMove,
                        afterNewPiece: this.onUserDrop,
                    }
                },
                premovable: {
                    enabled: true,
                    events: {
                        set: this.setPremove,
                        unset: this.unsetPremove,
                    }
                },
                predroppable: {
                    enabled: true,
                    events: {
                        set: this.setPredrop,
                        unset: this.unsetPredrop,
                    }
                },
                events: {
                    move: this.onMove(),
                    dropNewPiece: this.onDrop(),
                    select: this.onSelect(this.chessground.state.selected),
                }
            });
        }
        ;
        this.gating = gating_1.default(this);
        this.promotion = promotion_1.default(this);
        // initialize users
        const player0 = document.getElementById('rplayer0');
        const player1 = document.getElementById('rplayer1');
        this.vplayer0 = patch(player0, player_1.player('player0', this.titles[0], this.players[0], model["level"]));
        this.vplayer1 = patch(player1, player_1.player('player1', this.titles[1], this.players[1], model["level"]));
        // initialize pockets
        if (chess_1.needPockets(this.variant)) {
            const pocket0 = document.getElementById('pocket0');
            const pocket1 = document.getElementById('pocket1');
            pocket_1.updatePockets(this, pocket0, pocket1);
        }
        // initialize clocks
        const c0 = new clock_1.Clock(this.base, this.inc, document.getElementById('clock0'), 'clock0');
        const c1 = new clock_1.Clock(this.base, this.inc, document.getElementById('clock1'), 'clock1');
        this.clocks = [c0, c1];
        this.clocks[0].onTick(clock_1.renderTime);
        this.clocks[1].onTick(clock_1.renderTime);
        const onMoreTime = () => {
            // TODO: enable when this.flip is true
            if (this.model['wtitle'] === 'BOT' || this.model['btitle'] === 'BOT' || this.spectator || this.status >= 0 || this.flip)
                return;
            this.clocks[0].setTime(this.clocks[0].duration + 15 * 1000);
            this.doSend({ type: "moretime", gameId: this.model["gameId"] });
            chat_1.chatMessage('', this.oppcolor + ' +15 seconds', "roundchat");
        };
        var container = document.getElementById('clock0');
        patch(container, h_1.h('div.clock-wrap#clock0', [
            h_1.h('div.more-time', [
                h_1.h('button.icon.icon-plus-square', {
                    props: { type: "button", title: "Give 15 seconds" },
                    on: { click: () => onMoreTime() }
                })
            ])
        ]));
        const flagCallback = () => {
            if (this.turnColor === this.mycolor) {
                this.chessground.stop();
                console.log("Flag");
                this.doSend({ type: "flag", gameId: this.model["gameId"] });
            }
        };
        if (!this.spectator)
            this.clocks[1].onFlag(flagCallback);
        const abort = () => {
            console.log("Abort");
            this.doSend({ type: "abort", gameId: this.model["gameId"] });
        };
        const draw = () => {
            console.log("Draw");
            this.doSend({ type: "draw", gameId: this.model["gameId"] });
        };
        const resign = () => {
            console.log("Resign");
            this.doSend({ type: "resign", gameId: this.model["gameId"] });
        };
        var container = document.getElementById('game-controls');
        if (!this.spectator) {
            this.gameControls = patch(container, h_1.h('div.btn-controls', [
                h_1.h('button#abort', { on: { click: () => abort() }, props: { title: 'Abort' } }, [h_1.h('i', { class: { "icon": true, "icon-abort": true } }),]),
                h_1.h('button#draw', { on: { click: () => draw() }, props: { title: "Draw" } }, [h_1.h('i', { class: { "icon": true, "icon-hand-paper-o": true } }),]),
                h_1.h('button#resign', { on: { click: () => resign() }, props: { title: "Resign" } }, [h_1.h('i', { class: { "icon": true, "icon-flag-o": true } }),]),
            ]));
        }
        else {
            this.gameControls = patch(container, h_1.h('div'));
        }
        patch(document.getElementById('board-settings'), settings_1.settingsView(this));
        patch(document.getElementById('movelist'), movelist_1.movelistView(this));
        patch(document.getElementById('roundchat'), chat_1.chatView(this, "roundchat"));
    }
}
exports.default = RoundController;

},{"./chat":34,"./chess":35,"./clock":36,"./gating":37,"./movelist":40,"./player":41,"./pocket":43,"./profile":44,"./promotion":45,"./resize":46,"./settings":49,"./sound":50,"./user":51,"chessgroundx":4,"chessgroundx/util":17,"snabbdom":26,"snabbdom/h":19,"snabbdom/modules/attributes":22,"snabbdom/modules/class":23,"snabbdom/modules/eventlisteners":24,"snabbdom/modules/props":25,"sockette":30}],49:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const class_1 = __importDefault(require("snabbdom/modules/class"));
const attributes_1 = __importDefault(require("snabbdom/modules/attributes"));
const props_1 = __importDefault(require("snabbdom/modules/props"));
const eventlisteners_1 = __importDefault(require("snabbdom/modules/eventlisteners"));
const patch = snabbdom_1.init([class_1.default, attributes_1.default, props_1.default, eventlisteners_1.default]);
const h_1 = __importDefault(require("snabbdom/h"));
const types_1 = require("chessgroundx/types");
const chess_1 = require("./chess");
const pocket_1 = require("./pocket");
const chess_2 = require("./chess");
const player_1 = require("./player");
const roundCtrl_1 = __importDefault(require("./roundCtrl"));
// TODO: add dark/light theme buttons (icon-sun-o/icon-moon-o)
function changeCSS(cssFile) {
    // css file index in template.html
    var cssLinkIndex = 1;
    if (cssFile.includes("xiangqi")) {
        cssLinkIndex = 3;
    }
    else if (cssFile.includes("shogi")) {
        cssLinkIndex = 2;
    }
    else if (cssFile.includes("capa")) {
        cssLinkIndex = 4;
    }
    else if (cssFile.includes("makruk")) {
        cssLinkIndex = 5;
    }
    else if (cssFile.includes("sittuyin")) {
        cssLinkIndex = 6;
    }
    else if (cssFile.includes("seir")) {
        cssLinkIndex = 7;
    }
    else if (cssFile.includes("8x8")) {
        cssLinkIndex = 8;
    }
    else if (cssFile.includes("10x8")) {
        cssLinkIndex = 9;
    }
    else if (cssFile.includes("10x10")) {
        cssLinkIndex = 10;
    }
    else if (cssFile.includes("9x9")) {
        cssLinkIndex = 11;
    }
    else if (cssFile.includes("9x10")) {
        cssLinkIndex = 12;
    }
    else if (cssFile.includes("makrb")) {
        cssLinkIndex = 13;
    }
    else if (cssFile.includes("sittb")) {
        cssLinkIndex = 14;
    }
    document.getElementsByTagName("link").item(cssLinkIndex).setAttribute("href", cssFile);
}
exports.changeCSS = changeCSS;
function setBoard(CSSindexesB, variant, color) {
    console.log("setBoard()", CSSindexesB, variant, color);
    var idx = CSSindexesB[chess_1.variants.indexOf(variant)];
    idx = Math.min(idx, chess_1.VARIANTS[variant].BoardCSS.length - 1);
    changeCSS('/static/' + chess_1.VARIANTS[variant].BoardCSS[idx] + '.css');
}
function setPieces(CSSindexesP, variant, color) {
    console.log("setPieces()", CSSindexesP, variant, color);
    var idx = CSSindexesP[chess_1.variants.indexOf(variant)];
    idx = Math.min(idx, chess_1.VARIANTS[variant].PieceCSS.length - 1);
    if (variant === "shogi") {
        var css = chess_1.VARIANTS[variant].PieceCSS[idx];
        // change shogi piece colors according to board orientation
        if (color === "black")
            css = css.replace('0', '1');
        changeCSS('/static/' + css + '.css');
    }
    else {
        changeCSS('/static/' + chess_1.VARIANTS[variant].PieceCSS[idx] + '.css');
    }
}
function setZoom(ctrl, zoom) {
    const el = document.querySelector('.cg-wrap');
    if (el) {
        const baseWidth = types_1.dimensions[chess_1.VARIANTS[ctrl.variant].geom].width * (ctrl.variant === "shogi" ? 52 : 64);
        const baseHeight = types_1.dimensions[chess_1.VARIANTS[ctrl.variant].geom].height * (ctrl.variant === "shogi" ? 60 : 64);
        const pxw = `${zoom / 100 * baseWidth}px`;
        const pxh = `${zoom / 100 * baseHeight}px`;
        el.style.width = pxw;
        el.style.height = pxh;
        var pxp = (chess_2.needPockets(ctrl.variant)) ? '132px;' : '0px;';
        if (ctrl instanceof roundCtrl_1.default) {
            pxp = '500px;';
        }
        document.body.setAttribute('style', '--cgwrapwidth:' + pxw + ';--cgwrapheight:' + pxh + ';--pocketheight:' + pxp);
        document.body.dispatchEvent(new Event('chessground.resize'));
        localStorage.setItem("zoom-" + ctrl.variant, String(zoom));
    }
}
// flip
function toggleOrientation(ctrl) {
    ctrl.flip = !ctrl.flip;
    ctrl.chessground.toggleOrientation();
    if (ctrl.variant === "shogi") {
        const color = ctrl.chessground.state.orientation === "white" ? "white" : "black";
        setPieces(ctrl.CSSindexesP, ctrl.variant, color);
    }
    ;
    console.log("FLIP");
    if (chess_2.needPockets(ctrl.variant)) {
        const tmp_pocket = ctrl.pockets[0];
        ctrl.pockets[0] = ctrl.pockets[1];
        ctrl.pockets[1] = tmp_pocket;
        ctrl.vpocket0 = patch(ctrl.vpocket0, pocket_1.pocketView(ctrl, ctrl.flip ? ctrl.mycolor : ctrl.oppcolor, "top"));
        ctrl.vpocket1 = patch(ctrl.vpocket1, pocket_1.pocketView(ctrl, ctrl.flip ? ctrl.oppcolor : ctrl.mycolor, "bottom"));
    }
    // TODO: moretime button
    const new_running_clck = (ctrl.clocks[0].running) ? ctrl.clocks[1] : ctrl.clocks[0];
    ctrl.clocks[0].pause(false);
    ctrl.clocks[1].pause(false);
    const tmp_clock = ctrl.clocks[0];
    const tmp_clock_time = tmp_clock.duration;
    ctrl.clocks[0].setTime(ctrl.clocks[1].duration);
    ctrl.clocks[1].setTime(tmp_clock_time);
    if (ctrl.status < 0)
        new_running_clck.start();
    ctrl.vplayer0 = patch(ctrl.vplayer0, player_1.player('player0', ctrl.titles[ctrl.flip ? 1 : 0], ctrl.players[ctrl.flip ? 1 : 0], ctrl.model["level"]));
    ctrl.vplayer1 = patch(ctrl.vplayer1, player_1.player('player1', ctrl.titles[ctrl.flip ? 0 : 1], ctrl.players[ctrl.flip ? 0 : 1], ctrl.model["level"]));
}
exports.toggleOrientation = toggleOrientation;
function gearButton(ctrl) {
    return h_1.default('button#gear', {
        on: { click: () => toggleBoardSettings(ctrl) },
        class: { "selected": ctrl.settings }
    }, [h_1.default('i', {
            props: { title: 'Settings' },
            class: { "icon": true, "icon-cog": true }
        })]);
}
exports.gearButton = gearButton;
function toggleBoardSettings(ctrl) {
    ctrl.settings = !ctrl.settings;
    const el = document.getElementById('gear');
    if (el instanceof Element)
        patch(ctrl.vgear, gearButton(ctrl));
    document.getElementById('movelist-block').style.display = (ctrl.settings) ? 'none' : 'inline-grid';
    document.getElementById('board-settings').style.display = (ctrl.settings) ? 'inline-grid' : 'none';
}
exports.toggleBoardSettings = toggleBoardSettings;
function renderBoards(ctrl) {
    const variant = ctrl.variant;
    var vboard = ctrl.CSSindexesB[chess_1.variants.indexOf(ctrl.variant)];
    var i;
    const boards = [];
    const toggleBoards = (e) => {
        const idx = e.target.value;
        //console.log("toggleBoards()", idx);
        ctrl.CSSindexesB[chess_1.variants.indexOf(ctrl.variant)] = idx;
        localStorage.setItem(ctrl.variant + "_board", String(idx));
        setBoard(ctrl.CSSindexesB, ctrl.variant, ctrl.mycolor);
    };
    for (i = 0; i < chess_1.VARIANTS[ctrl.variant].BoardCSS.length; i++) {
        boards.push(h_1.default('input#board' + String(i), {
            on: { change: toggleBoards },
            props: { type: "radio", name: "board", value: String(i), checked: vboard === String(i) ? "checked" : "" }
        }));
        boards.push(h_1.default('label.board.board' + String(i) + '.' + variant, { attrs: { for: "board" + String(i) } }, ""));
    }
    return boards;
}
function renderPieces(ctrl) {
    const variant = ctrl.variant;
    var vpiece = ctrl.CSSindexesP[chess_1.variants.indexOf(ctrl.variant)];
    var i;
    const pieces = [];
    const togglePieces = (e) => {
        const idx = e.target.value;
        //console.log("togglePieces()", idx);
        ctrl.CSSindexesP[chess_1.variants.indexOf(ctrl.variant)] = idx;
        localStorage.setItem(ctrl.variant + "_pieces", String(idx));
        setPieces(ctrl.CSSindexesP, ctrl.variant, ctrl.mycolor);
    };
    for (i = 0; i < chess_1.VARIANTS[ctrl.variant].PieceCSS.length; i++) {
        pieces.push(h_1.default('input#piece' + String(i), {
            on: { change: togglePieces },
            props: { type: "radio", name: "piece", value: String(i), checked: vpiece === String(i) ? "checked" : "" }
        }));
        pieces.push(h_1.default('label.piece.piece' + String(i) + '.' + variant, { attrs: { for: "piece" + String(i) } }, ""));
    }
    return pieces;
}
function settingsView(ctrl) {
    if (chess_1.VARIANTS[ctrl.variant].BoardCSS.length > 1)
        setBoard(ctrl.CSSindexesB, ctrl.variant, ctrl.mycolor);
    if (chess_1.VARIANTS[ctrl.variant].PieceCSS.length > 1)
        setPieces(ctrl.CSSindexesP, ctrl.variant, ctrl.mycolor);
    // turn settings panel off
    toggleBoardSettings(ctrl);
    const zoom = localStorage["zoom-" + ctrl.variant];
    if (zoom !== undefined && zoom !== 100)
        setZoom(ctrl, Number(zoom));
    return h_1.default('div#board-settings', [
        h_1.default('div.settings-pieces', renderPieces(ctrl)),
        h_1.default('div.settings-boards', renderBoards(ctrl)),
        // TODO: how to horizontaly center this?
        // h('label.zoom', { attrs: {for: "zoom"} }, "Board size"),
        h_1.default('input#zoom', {
            class: { "slider": true },
            attrs: { name: 'zoom', width: '280px', type: 'range', value: Number(zoom), min: 60, max: 140 },
            on: { input: (e) => { setZoom(ctrl, parseFloat(e.target.value)); } }
        }),
    ]);
}
exports.settingsView = settingsView;

},{"./chess":35,"./player":41,"./pocket":43,"./roundCtrl":48,"chessgroundx/types":16,"snabbdom":26,"snabbdom/h":19,"snabbdom/modules/attributes":22,"snabbdom/modules/class":23,"snabbdom/modules/eventlisteners":24,"snabbdom/modules/props":25}],50:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class sounds {
    constructor() {
        this.buildManySounds = (file, qty) => {
            var soundArray = [];
            while (soundArray.length < qty) {
                var el = document.createElement("audio");
                if (el.canPlayType('audio/mpeg')) {
                    el.src = '/static/sound/' + file + '.mp3';
                }
                else {
                    el.src = '/static/sound/' + file + '.ogg';
                }
                el.setAttribute("preload", "none");
                el.style.display = "none";
                soundArray.push(el);
                document.body.appendChild(el);
            }
            return soundArray;
        };
        this.getSound = (type) => {
            let target = this.tracks[type];
            target.index = (target.index + 1) % target.pool.length;
            // console.log("SOUND:", type, target.index);
            return target.pool[target.index];
        };
        this.tracks = {
            GenericNotify: { name: 'GenericNotify', qty: 1, pool: [], index: 0 },
            Move: { name: 'Move', qty: 6, pool: [], index: 0 },
            Capture: { name: 'Capture', qty: 4, pool: [], index: 0 },
            Check: { name: 'Check', qty: 2, pool: [], index: 0 },
            Draw: { name: 'Draw', qty: 1, pool: [], index: 0 },
            Victory: { name: 'Victory', qty: 1, pool: [], index: 0 },
            Defeat: { name: 'Defeat', qty: 1, pool: [], index: 0 },
            ShogiMove: { name: 'komaoto5', qty: 6, pool: [], index: 0 },
            Chat: { name: 'chat', qty: 1, pool: [], index: 0 },
        };
        Object.keys(this.tracks).forEach(key => {
            let type = this.tracks[key];
            type.pool = this.buildManySounds(type.name, type.qty);
        });
    }
    genericNotify() { this.getSound('GenericNotify').play(); }
    ;
    move() { this.getSound('Move').play(); }
    ;
    capture() { this.getSound('Capture').play(); }
    ;
    check() { this.getSound('Check').play(); }
    ;
    draw() { this.getSound('Draw').play(); }
    ;
    victory() { this.getSound('Victory').play(); }
    ;
    defeat() { this.getSound('Defeat').play(); }
    ;
    shogimove() { this.getSound('ShogiMove').play(); }
    ;
    chat() { this.getSound('Chat').play(); }
    ;
}
exports.sound = new (sounds);

},{}],51:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const snabbdom_1 = require("snabbdom");
const class_1 = __importDefault(require("snabbdom/modules/class"));
const attributes_1 = __importDefault(require("snabbdom/modules/attributes"));
const props_1 = __importDefault(require("snabbdom/modules/props"));
const eventlisteners_1 = __importDefault(require("snabbdom/modules/eventlisteners"));
const patch = snabbdom_1.init([class_1.default, attributes_1.default, props_1.default, eventlisteners_1.default]);
const h_1 = __importDefault(require("snabbdom/h"));
// TODO: create logout button when logged in
/*
function login(home) {
    console.log("LOGIN WITH LICHESS");
    window.location.assign(home + '/login');
};
*/
function renderUsername(home, username) {
    console.log("renderUsername()", username, home);
    var oldVNode = document.getElementById('username');
    if (oldVNode instanceof Element) {
        oldVNode.innerHTML = '';
        patch(oldVNode, h_1.default('div#username', h_1.default('a.nav-link', { attrs: { href: '/@/' + username } }, username)));
    }
    ;
    /*
        // if username is not a logged in name login else logout button
        var oldVNode = document.getElementById('login');
        if (oldVNode instanceof Element) {
            oldVNode.innerHTML = '';
            patch(oldVNode as HTMLElement, h('button', { on: { click: () => login(home) }, props: {title: 'Login with Lichess'} }, [h('i', {class: {"icon": true, "icon-sign-in": true} } ), ]));
        };
    */
}
exports.renderUsername = renderUsername;

},{"snabbdom":26,"snabbdom/h":19,"snabbdom/modules/attributes":22,"snabbdom/modules/class":23,"snabbdom/modules/eventlisteners":24,"snabbdom/modules/props":25}]},{},[39])(39)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvY2hlc3Nncm91bmR4L3NyYy9hbmltLnRzIiwibm9kZV9tb2R1bGVzL2NoZXNzZ3JvdW5keC9zcmMvYXBpLnRzIiwibm9kZV9tb2R1bGVzL2NoZXNzZ3JvdW5keC9zcmMvYm9hcmQudHMiLCJub2RlX21vZHVsZXMvY2hlc3Nncm91bmR4L3NyYy9jaGVzc2dyb3VuZC50cyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZHgvc3JjL2NvbmZpZy50cyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZHgvc3JjL2RyYWcudHMiLCJub2RlX21vZHVsZXMvY2hlc3Nncm91bmR4L3NyYy9kcmF3LnRzIiwibm9kZV9tb2R1bGVzL2NoZXNzZ3JvdW5keC9zcmMvZHJvcC50cyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZHgvc3JjL2V2ZW50cy50cyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZHgvc3JjL2V4cGxvc2lvbi50cyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZHgvc3JjL2Zlbi50cyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZHgvc3JjL3ByZW1vdmUudHMiLCJub2RlX21vZHVsZXMvY2hlc3Nncm91bmR4L3NyYy9yZW5kZXIudHMiLCJub2RlX21vZHVsZXMvY2hlc3Nncm91bmR4L3NyYy9zdGF0ZS50cyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZHgvc3JjL3N2Zy50cyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZHgvc3JjL3R5cGVzLnRzIiwibm9kZV9tb2R1bGVzL2NoZXNzZ3JvdW5keC9zcmMvdXRpbC50cyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZHgvc3JjL3dyYXAudHMiLCJub2RlX21vZHVsZXMvc25hYmJkb20vaC5qcyIsIm5vZGVfbW9kdWxlcy9zbmFiYmRvbS9odG1sZG9tYXBpLmpzIiwibm9kZV9tb2R1bGVzL3NuYWJiZG9tL2lzLmpzIiwibm9kZV9tb2R1bGVzL3NuYWJiZG9tL21vZHVsZXMvYXR0cmlidXRlcy5qcyIsIm5vZGVfbW9kdWxlcy9zbmFiYmRvbS9tb2R1bGVzL2NsYXNzLmpzIiwibm9kZV9tb2R1bGVzL3NuYWJiZG9tL21vZHVsZXMvZXZlbnRsaXN0ZW5lcnMuanMiLCJub2RlX21vZHVsZXMvc25hYmJkb20vbW9kdWxlcy9wcm9wcy5qcyIsIm5vZGVfbW9kdWxlcy9zbmFiYmRvbS9zbmFiYmRvbS5qcyIsIm5vZGVfbW9kdWxlcy9zbmFiYmRvbS90aHVuay5qcyIsIm5vZGVfbW9kdWxlcy9zbmFiYmRvbS90b3Zub2RlLmpzIiwibm9kZV9tb2R1bGVzL3NuYWJiZG9tL3Zub2RlLmpzIiwibm9kZV9tb2R1bGVzL3NvY2tldHRlL2Rpc3Qvc29ja2V0dGUuanMiLCJzcmMvYWJvdXQudHMiLCJzcmMvYW5hbHlzaXMudHMiLCJzcmMvYW5hbHlzaXNDdHJsLnRzIiwic3JjL2NoYXQudHMiLCJzcmMvY2hlc3MudHMiLCJzcmMvY2xvY2sudHMiLCJzcmMvZ2F0aW5nLnRzIiwic3JjL2xvYmJ5LnRzIiwic3JjL21haW4udHMiLCJzcmMvbW92ZWxpc3QudHMiLCJzcmMvcGxheWVyLnRzIiwic3JjL3BsYXllcnMudHMiLCJzcmMvcG9ja2V0LnRzIiwic3JjL3Byb2ZpbGUudHMiLCJzcmMvcHJvbW90aW9uLnRzIiwic3JjL3Jlc2l6ZS50cyIsInNyYy9yb3VuZC50cyIsInNyYy9yb3VuZEN0cmwudHMiLCJzcmMvc2V0dGluZ3MudHMiLCJzcmMvc291bmQudHMiLCJzcmMvdXNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQ0EsK0JBQThCO0FBNEI5QixTQUFnQixJQUFJLENBQUksUUFBcUIsRUFBRSxLQUFZO0lBQ3pELE9BQU8sS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUs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QUssQ0FBQztJQUNuQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFBRSxPQUFPLEtBQUssQ0FBQztJQUN2RCxNQUFNLE9BQU8sR0FBRyxjQUFPLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQzVDLElBQUksVUFBVSxFQUFFLFVBQVUsRUFBRSxVQUFVLENBQUM7SUFDdkMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDeEMsVUFBVSxHQUFHLGNBQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEQsVUFBVSxHQUFHLGNBQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEQsVUFBVSxHQUFHLGNBQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDdkQ7U0FBTSxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUMvQyxVQUFVLEdBQUcsY0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0RCxVQUFVLEdBQUcsY0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0RCxVQUFVLEdBQUcsY0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxD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LE1BQU0sRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLE9BQU87Q0FBRSxDQUFDO0FBRXBHLE1BQU0sT0FBTyxHQUFrQztJQUMzQyxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsU0FBUztDQUFFLENBQUM7QUFHM0YsTUFBTSxRQUFRLEdBQUc7SUFDYixJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsR0FBRztDQUFFLENBQUM7QUFFekssTUFBTSxRQUFRLEdBQUc7SUFDYixJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHO0lBQzdGLEtBQUssRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFB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LEVBQUUsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FDdEMsS0FBSyxLQUFLLE9BQU8sQ0FBQyxDQUFDO1FBQ2pCLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6RSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUMxRSxDQUNGLENBQUM7QUFDSixDQUFDO0FBR0QsU0FBUyxLQUFLLENBQUMsS0FBZTtJQUM1QixPQUFPLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hHLENBQUM7QUFHRCxTQUFTLE9BQU8sQ0FBQyxLQUFlO0lBQzlCLE9BQU8sQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEtBQUssS0FBSyxPQUFPLENBQUMsQ0FBQztRQUM1QyxDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDdkUsQ0FBQztBQUdELE1BQU0sS0FBSyxHQUFhLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7SUFDekMsT0FBTyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ3hFLENBQUMsQ0FBQTtBQUdELE1BQU0sT0FBTyxHQUFhLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7SUFDM0MsT0FBTyxNQUFNLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzFFLENBQUMsQ0FBQTtBQUdELE1BQU0sS0FBSyxHQUFhLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7SUFDekMsT0FBTyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUE7QUFHRCxTQUFTLEtBQUssQ0FBQyxLQUFlO0lBQzVCLE9BQU8sQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQ3pCLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FDdEYsQ0FBQztBQUNOLENBQUM7QUFHRCxNQUFNLE9BQU8sR0FBYSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0lBQzNDLE9BQU8sSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzdELENBQUMsQ0FBQTtBQUdELE1BQU0sT0FBTyxHQUFhLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7SUFDM0MsT0FBTyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDN0QsQ0FBQyxDQUFBO0FBR0QsTUFBTSxLQUFLLEdBQWEsQ0FBQyxFQUFFLEVBQUUs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QUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNwQyxNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFFdEMsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3BDLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUVyQyxNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFFdEMsTUFBTSxVQUFVLEdBQWEsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUYsTUFBTSxVQUFVLEdBQWEsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUYsTUFBTSxXQUFXLEdBQWEsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEcsTUFBTSxXQUFXLEdBQWEsS0FBSyxDQUFDLFNBQVMsQ0FB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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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LENBQUMsQ0FBQztJQUMvQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzdCLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtRQUNsQixLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDO1FBQ2YsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1FBQzFELEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQTtLQUM3RDtTQUFNO1FBQ0gsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1FBQzFELEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQTtRQUMxRCxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUE7UUFDMUQsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO0tBQzdEO0lBQ0QsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzFCLENBQUM7QUFkRCwwQkFjQztBQUVELFNBQWdCLFVBQVUsQ0FBQyxJQUFJO0lBQzNCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDN0IsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO1FBQ2xCLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0tBQzNDO0lBQ0QsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDeEMsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzFCLENBQUM7QUFQRCxnQ0FPQztBQUVELFNBQWdCLFVBQVUsQ0FBQyxJQUFJO0lBQzNCLGlDQUFpQztJQUNqQyxJQUFJLEtBQUssR0FBRyxFQUFFLENBQUM7SUFDZixJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUU7UUFDN0MsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QixJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUM1QjtJQUNELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7SUFFN0IsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO1FBQ2xCLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7S0FDN0U7SUFDRCxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUU7UUFDdkMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xELEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUM3QyxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUM7S0FDNUQ7U0FBTTtRQUNILEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3ZDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUM3QyxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUM7S0FDNUQ7QUFDTCxDQUFDO0FBckJELGdDQXFCQztBQUVZLFFBQUEsU0FBUyxHQUFHO0lBQ3JCLElBQUksRUFBRSxHQUFHO0lBQ1QsTUFBTSxFQUFFLEdBQUc7SUFDWCxNQUFNLEVBQUUsR0FBRztJQUNYLElBQUksRUFB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TyxDQUFDLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDbEYsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztZQUMzQixNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQztZQUM3QyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN4RixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoRyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMxRixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN4RixJQUFJLEtB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QUUsS0FBSyxFQUFFLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBQyxFQUFFLEVBQUUsR0FBRyxDQUFDO2dDQUNyRCxXQUFDLENBQUMsV0FBVyxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQztnQ0FDaEgsV0FBQyxDQUFDLG9CQUFvQixFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBQyxFQUFFLEVBQUUsR0FBRyxDQUFDO2dDQUNyRCxXQUFDLENBQUMsV0FBVyxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQztnQ0FDaEgsV0FBQyxDQUFDLG9CQUFvQixFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBQyxFQUFFLEVBQUUsR0FBRyxDQUFDO2dDQUNyRCxXQUFDLENBQUMsV0FBVyxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQztnQ0FDaEgsV0FBQyxDQUFDLG9CQUFvQixFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBQyxFQUFFLEVBQUUsR0FBRyxDQUFDO2dDQUNyRCxXQUFDLENBQUMsV0FBVyxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQztnQ0FDaEgsV0FBQyxDQUFDLG9CQUFvQixFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBQyxFQUFFLEVBQUUsR0FBRyxDQUFDO2dDQUNyRCxXQUFDLENBQUMsV0FBVyxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQztnQ0FDaEgsV0FBQyxDQUFDLG9CQUFvQixFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBQyxFQUFFLEVBQUUsR0FBRyxDQUFDO2dDQUNyRCxXQUFDLENBQUMsV0FBVyxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQztnQ0FDaEgsV0FBQyxDQUFDLG9CQUFvQixFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBQyxFQUFFLEVBQUUsR0FBRyxDQUFDO2dDQUNyRCxXQUFDLENBQUMsV0FBVyxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFF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LHVDQUF3QztBQUN4Qyx1Q0FBd0M7QUFFeEMsTUFBTSxLQUFLLEdBQUcsRUFBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUMsQ0FBQztBQUU3SyxJQUFJLFNBQVMsR0FBRyxVQUFTLElBQUk7SUFDekIsSUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDekMsS0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUcsRUFBRSxDQUFDLEVBQUU7UUFDcEMsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN4QyxJQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJO1lBQ2QsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDdEI7SUFDRCxPQUFPLEVBQUUsQ0FBQztBQUNkLENBQUMsQ0FBQTtBQUVELFNBQWdCLElBQUksQ0FBQyxFQUFFLEVBQUUsS0FBSztJQUMxQixNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDL0IsSUFBSSxJQUFJLEtBQUssRUFBRTtRQUFFLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxJQUFJLENBQUM7SUFFMUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDN0MsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDN0MsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDckQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDbkQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDckQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDL0MsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUN0RSxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUNqRCxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUNuRCxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUNqRCxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUNuRCxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUNqRCxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMzQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcs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LFdBQUMsQ0FBQyxjQUFjLEVBQUUsV0FBQyxDQUFDLFlBQVksRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFDLElBQUksRUFBRSxLQUFLLEdBQUcsUUFBUSxFQUFDLEVBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDbkg7SUFBQSxDQUFDO0lBQ047Ozs7Ozs7TUFPRTtBQUNGLENBQUM7QUFmRCx3Q0FlQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsImltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSdcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAnLi91dGlsJ1xuaW1wb3J0ICogYXMgY2cgZnJvbSAnLi90eXBlcydcblxuZXhwb3J0IHR5cGUgTXV0YXRpb248QT4gPSAoc3RhdGU6IFN0YXRlKSA9PiBBO1xuXG4vLyAwLDEgYW5pbWF0aW9uIGdvYWxcbi8vIDIsMyBhbmltYXRpb24gY3VycmVudCBzdGF0dXNcbmV4cG9ydCB0eXBlIEFuaW1WZWN0b3IgPSBjZy5OdW1iZXJRdWFkXG5cbmV4cG9ydCBpbnRlcmZhY2UgQW5pbVZlY3RvcnMge1xuICBba2V5OiBzdHJpbmddOiBBbmltVmVjdG9yXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQW5pbUZhZGluZ3Mge1xuICBba2V5OiBzdHJpbmddOiBjZy5QaWVjZVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFuaW1QbGFuIHtcbiAgYW5pbXM6IEFuaW1WZWN0b3JzO1xuICBmYWRpbmdzOiBBbmltRmFkaW5ncztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBbmltQ3VycmVudCB7XG4gIHN0YXJ0OiBET01IaWdoUmVzVGltZVN0YW1wO1xuICBmcmVxdWVuY3k6IGNnLktIejtcbiAgcGxhbjogQW5pbVBsYW47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhbmltPEE+KG11dGF0aW9uOiBNdXRhdGlvbjxBPiwgc3RhdGU6IFN0YXRlKTogQSB7XG4gIHJldHVybiBzdGF0ZS5hbmltYXRpb24uZW5hYmxlZCA/IGFuaW1hdGUobXV0YXRpb24sIHN0YXRlKSA6IHJlbmRlcihtdXRhdGlvbiwgc3RhdGUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyPEE+KG11dGF0aW9uOiBNdXRhdGlvbjxBPiwgc3RhdGU6IFN0YXRlKTogQSB7XG4gIGNvbnN0IHJlc3VsdCA9IG11dGF0aW9uKHN0YXRlKTtcbiAgc3RhdGUuZG9tLnJlZHJhdygpO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG5pbnRlcmZhY2UgQW5pbVBpZWNlIHtcbiAga2V5OiBjZy5LZXk7XG4gIHBvczogY2cuUG9zO1xuICBwaWVjZTogY2cuUGllY2U7XG59XG5pbnRlcmZhY2UgQW5pbVBpZWNlcyB7XG4gIFtrZXk6IHN0cmluZ106IEFuaW1QaWVjZVxufVxuXG5mdW5jdGlvbiBtYWtlUGllY2Uoa2V5OiBjZy5LZXksIHBpZWNlOiBjZy5QaWVjZSwgZmlyc3RSYW5rSXMwOiBib29sZWFuKTogQW5pbVBpZWNlIHtcbiAgcmV0dXJuIHtcbiAgICBrZXk6IGtleSxcbiAgICBwb3M6IHV0aWwua2V5MnBvcyhrZXksIGZpcnN0UmFua0lzMCksXG4gICAgcGllY2U6IHBpZWNlXG4gIH07XG59XG5cbmZ1bmN0aW9uIGNsb3NlcihwaWVjZTogQW5pbVBpZWNlLCBwaWVjZXM6IEFuaW1QaWVjZVtdKTogQW5pbVBpZWNlIHtcbiAgcmV0dXJuIHBpZWNlcy5zb3J0KChwMSwgcDIpID0+IHtcbiAgICByZXR1cm4gdXRpbC5kaXN0YW5jZVNxKHBpZWNlLnBvcywgcDEucG9zKSAtIHV0aWwuZGlzdGFuY2VTcShwaWVjZS5wb3MsIHAyLnBvcyk7XG4gIH0pWzBdO1xufVxuXG5mdW5jdGlvbiBjb21wdXRlUGxhbihwcmV2UGllY2VzOiBjZy5QaWVjZXMsIGN1cnJlbnQ6IFN0YXRlKTogQW5pbVBsYW4ge1xuICBjb25zdCBmaXJzdFJhbmtJczAgPSBjdXJyZW50LmRpbWVuc2lvbnMuaGVpZ2h0ID09PSAxMDtcbiAgY29uc3QgYW5pbXM6IEFuaW1WZWN0b3JzID0ge30sXG4gIGFuaW1lZE9yaWdzOiBjZy5LZXlbXSA9IFtdLFxuICBmYWRpbmdzOiBBbmltRmFkaW5ncyA9IHt9LFxuICBtaXNzaW5nczogQW5pbVBpZWNlW10gPSBbXSxcbiAgbmV3czogQW5pbVBpZWNlW10gPSBbXSxcbiAgcHJlUGllY2VzOiBBbmltUGllY2VzID0ge307XG4gIGxldCBjdXJQOiBjZy5QaWVjZSB8IHVuZGVmaW5lZCwgcHJlUDogQW5pbVBpZWNlIHwgdW5kZWZpbmVkLCBpOiBhbnksIHZlY3RvcjogY2cuTnVtYmVyUGFpcjtcbiAgZm9yIChpIGluIHByZXZQaWVjZXMpIHtcbiAgICBwcmVQaWVjZXNbaV0gPSBtYWtlUGllY2UoaSBhcyBjZy5LZXksIHByZXZQaWVjZXNbaV0hLCBmaXJzdFJhbmtJczApO1xuICB9XG4gIGZvciAoY29uc3Qga2V5IG9mIHV0aWwuYWxsS2V5c1tjdXJyZW50Lmdlb21ldHJ5XSkge1xuICAgIGN1clAgPSBjdXJyZW50LnBpZWNlc1trZXldO1xuICAgIHByZVAgPSBwcmVQaWVjZXNba2V5XTtcbiAgICBpZiAoY3VyUCkge1xuICAgICAgaWYgKHByZVApIHtcbiAgICAgICAgaWYgKCF1dGlsLnNhbWVQaWVjZShjdXJQLCBwcmVQLnBpZWNlKSkge1xuICAgICAgICAgIG1pc3NpbmdzLnB1c2gocHJlUCk7XG4gICAgICAgICAgbmV3cy5wdXNoKG1ha2VQaWVjZShrZXksIGN1clAsIGZpcnN0UmFua0lzMCkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgbmV3cy5wdXNoKG1ha2VQaWVjZShrZXksIGN1clAsIGZpcnN0UmFua0lzMCkpO1xuICAgIH0gZWxzZSBpZiAocHJlUCkgbWlzc2luZ3MucHVzaChwcmVQKTtcbiAgfVxuICBuZXdzLmZvckVhY2gobmV3UCA9PiB7XG4gICAgcHJlUCA9IGNsb3NlcihuZXdQLCBtaXNzaW5ncy5maWx0ZXIocCA9PiB1dGlsLnNhbWVQaWVjZShuZXdQLnBpZWNlLCBwLnBpZWNlKSkpO1xuICAgIGlmIChwcmVQKSB7XG4gICAgICB2ZWN0b3IgPSBbcHJlUC5wb3NbMF0gLSBuZXdQLnBvc1swXSwgcHJlUC5wb3NbMV0gLSBuZXdQLnBvc1sxXV07XG4gICAgICBhbmltc1tuZXdQLmtleV0gPSB2ZWN0b3IuY29uY2F0KHZlY3RvcikgYXMgQW5pbVZlY3RvcjtcbiAgICAgIGFuaW1lZE9yaWdzLnB1c2gocHJlUC5rZXkpO1xuICAgIH1cbiAgfSk7XG4gIG1pc3NpbmdzLmZvckVhY2gocCA9PiB7XG4gICAgaWYgKCF1dGlsLmNvbnRhaW5zWChhbmltZWRPcmlncywgcC5rZXkpKSBmYWRpbmdzW3Aua2V5XSA9IHAucGllY2U7XG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgYW5pbXM6IGFuaW1zLFxuICAgIGZhZGluZ3M6IGZhZGluZ3NcbiAgfTtcbn1cblxuZnVuY3Rpb24gc3RlcChzdGF0ZTogU3RhdGUsIG5vdzogRE9NSGlnaFJlc1RpbWVTdGFtcCk6IHZvaWQge1xuICBjb25zdCBjdXIgPSBzdGF0ZS5hbmltYXRpb24uY3VycmVudDtcbiAgaWYgKGN1ciA9PT0gdW5kZWZpbmVkKSB7IC8vIGFuaW1hdGlvbiB3YXMgY2FuY2VsZWQgOihcbiAgICBpZiAoIXN0YXRlLmRvbS5kZXN0cm95ZWQpIHN0YXRlLmRvbS5yZWRyYXdOb3coKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgcmVzdCA9IDEgLSAobm93IC0gY3VyLnN0YXJ0KSAqIGN1ci5mcmVxdWVuY3k7XG4gIGlmIChyZXN0IDw9IDApIHtcbiAgICBzdGF0ZS5hbmltYXRpb24uY3VycmVudCA9IHVuZGVmaW5lZDtcbiAgICBzdGF0ZS5kb20ucmVkcmF3Tm93KCk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgZWFzZSA9IGVhc2luZyhyZXN0KTtcbiAgICBmb3IgKGxldCBpIGluIGN1ci5wbGFuLmFuaW1zKSB7XG4gICAgICBjb25zdCBjZmcgPSBjdXIucGxhbi5hbmltc1tpXTtcbiAgICAgIGNmZ1syXSA9IGNmZ1swXSAqIGVhc2U7XG4gICAgICBjZmdbM10gPSBjZmdbMV0gKiBlYXNlO1xuICAgIH1cbiAgICBzdGF0ZS5kb20ucmVkcmF3Tm93KHRydWUpOyAvLyBvcHRpbWlzYXRpb246IGRvbid0IHJlbmRlciBTVkcgY2hhbmdlcyBkdXJpbmcgYW5pbWF0aW9uc1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgobm93ID0gcGVyZm9ybWFuY2Uubm93KCkpID0+IHN0ZXAoc3RhdGUsIG5vdykpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFuaW1hdGU8QT4obXV0YXRpb246IE11dGF0aW9uPEE+LCBzdGF0ZTogU3RhdGUpOiBBIHtcbiAgLy8gY2xvbmUgc3RhdGUgYmVmb3JlIG11dGF0aW5nIGl0XG4gIGNvbnN0IHByZXZQaWVjZXM6IGNnLlBpZWNlcyA9IHsuLi5zdGF0ZS5waWVjZXN9O1xuXG4gIGNvbnN0IHJlc3VsdCA9IG11dGF0aW9uKHN0YXRlKTtcbiAgY29uc3QgcGxhbiA9IGNvbXB1dGVQbGFuKHByZXZQaWVjZXMsIHN0YXRlKTtcbiAgaWYgKCFpc09iamVjdEVtcHR5KHBsYW4uYW5pbXMpIHx8ICFpc09iamVjdEVtcHR5KHBsYW4uZmFkaW5ncykpIHtcbiAgICBjb25zdCBhbHJlYWR5UnVubmluZyA9IHN0YXRlLmFuaW1hdGlvbi5jdXJyZW50ICYmIHN0YXRlLmFuaW1hdGlvbi5jdXJyZW50LnN0YXJ0O1xuICAgIHN0YXRlLmFuaW1hdGlvbi5jdXJyZW50ID0ge1xuICAgICAgc3RhcnQ6IHBlcmZvcm1hbmNlLm5vdygpLFxuICAgICAgZnJlcXVlbmN5OiAxIC8gc3RhdGUuYW5pbWF0aW9uLmR1cmF0aW9uLFxuICAgICAgcGxhbjogcGxhblxuICAgIH07XG4gICAgaWYgKCFhbHJlYWR5UnVubmluZykgc3RlcChzdGF0ZSwgcGVyZm9ybWFuY2Uubm93KCkpO1xuICB9IGVsc2Uge1xuICAgIC8vIGRvbid0IGFuaW1hdGUsIGp1c3QgcmVuZGVyIHJpZ2h0IGF3YXlcbiAgICBzdGF0ZS5kb20ucmVkcmF3KCk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gaXNPYmplY3RFbXB0eShvOiBhbnkpOiBib29sZWFuIHtcbiAgZm9yIChsZXQgXyBpbiBvKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiB0cnVlO1xufVxuLy8gaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vZ3JlLzE2NTAyOTRcbmZ1bmN0aW9uIGVhc2luZyh0OiBudW1iZXIpOiBudW1iZXIge1xuICByZXR1cm4gdCA8IDAuNSA/IDQgKiB0ICogdCAqIHQgOiAodCAtIDEpICogKDIgKiB0IC0gMikgKiAoMiAqIHQgLSAyKSArIDE7XG59XG4iLCJpbXBvcnQgeyBTdGF0ZSB9IGZyb20gJy4vc3RhdGUnXG5pbXBvcnQgKiBhcyBib2FyZCBmcm9tICcuL2JvYXJkJ1xuaW1wb3J0IHsgd3JpdGUgYXMgZmVuV3JpdGUgfSBmcm9tICcuL2ZlbidcbmltcG9ydCB7IENvbmZpZywgY29uZmlndXJlIH0gZnJvbSAnLi9jb25maWcnXG5pbXBvcnQgeyBhbmltLCByZW5kZXIgfSBmcm9tICcuL2FuaW0nXG5pbXBvcnQgeyBjYW5jZWwgYXMgZHJhZ0NhbmNlbCwgZHJhZ05ld1BpZWNlIH0gZnJvbSAnLi9kcmFnJ1xuaW1wb3J0IHsgRHJhd1NoYXBlIH0gZnJvbSAnLi9kcmF3J1xuaW1wb3J0IGV4cGxvc2lvbiBmcm9tICcuL2V4cGxvc2lvbidcbmltcG9ydCAqIGFzIGNnIGZyb20gJy4vdHlwZXMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgQXBpIHtcblxuICAvLyByZWNvbmZpZ3VyZSB0aGUgaW5zdGFuY2UuIEFjY2VwdHMgYWxsIGNvbmZpZyBvcHRpb25zLCBleGNlcHQgZm9yIHZpZXdPbmx5ICYgZHJhd2FibGUudmlzaWJsZS5cbiAgLy8gYm9hcmQgd2lsbCBiZSBhbmltYXRlZCBhY2NvcmRpbmdseSwgaWYgYW5pbWF0aW9ucyBhcmUgZW5hYmxlZC5cbiAgc2V0KGNvbmZpZzogQ29uZmlnKTogdm9pZDtcblxuICAvLyByZWFkIGNoZXNzZ3JvdW5kIHN0YXRlOyB3cml0ZSBhdCB5b3VyIG93biByaXNrcy5cbiAgc3RhdGU6IFN0YXRlO1xuXG4gIC8vIGdldCB0aGUgcG9zaXRpb24gYXMgYSBGRU4gc3RyaW5nIChvbmx5IGNvbnRhaW5zIHBpZWNlcywgbm8gZmxhZ3MpXG4gIC8vIGUuZy4gcm5icWtibnIvcHBwcHBwcHAvOC84LzgvOC9QUFBQUFBQUC9STkJRS0JOUlxuICBnZXRGZW4oKTogY2cuRkVOO1xuXG4gIC8vIGNoYW5nZSB0aGUgdmlldyBhbmdsZVxuICB0b2dnbGVPcmllbnRhdGlvbigpOiB2b2lkO1xuXG4gIC8vIHBlcmZvcm0gYSBtb3ZlIHByb2dyYW1tYXRpY2FsbHlcbiAgbW92ZShvcmlnOiBjZy5LZXksIGRlc3Q6IGNnLktleSk6IHZvaWQ7XG5cbiAgLy8gYWRkIGFuZC9vciByZW1vdmUgYXJiaXRyYXJ5IHBpZWNlcyBvbiB0aGUgYm9hcmRcbiAgc2V0UGllY2VzKHBpZWNlczogY2cuUGllY2VzRGlmZik6IHZvaWQ7XG5cbiAgLy8gY2xpY2sgYSBzcXVhcmUgcHJvZ3JhbW1hdGljYWxseVxuICBzZWxlY3RTcXVhcmUoa2V5OiBjZy5LZXkgfCBudWxsLCBmb3JjZT86IGJvb2xlYW4pOiB2b2lkO1xuXG4gIC8vIHB1dCBhIG5ldyBwaWVjZSBvbiB0aGUgYm9hcmRcbiAgbmV3UGllY2UocGllY2U6IGNnLlBpZWNlLCBrZXk6IGNnLktleSk6IHZvaWQ7XG5cbiAgLy8gcGxheSB0aGUgY3VycmVudCBwcmVtb3ZlLCBpZiBhbnk7IHJldHVybnMgdHJ1ZSBpZiBwcmVtb3ZlIHdhcyBwbGF5ZWRcbiAgcGxheVByZW1vdmUoKTogYm9vbGVhbjtcblxuICAvLyBjYW5jZWwgdGhlIGN1cnJlbnQgcHJlbW92ZSwgaWYgYW55XG4gIGNhbmNlbFByZW1vdmUoKTogdm9pZDtcblxuICAvLyBwbGF5IHRoZSBjdXJyZW50IHByZWRyb3AsIGlmIGFueTsgcmV0dXJucyB0cnVlIGlmIHByZW1vdmUgd2FzIHBsYXllZFxuICBwbGF5UHJlZHJvcCh2YWxpZGF0ZTogKGRyb3A6IGNnLkRyb3ApID0+IGJvb2xlYW4pOiBib29sZWFuO1xuXG4gIC8vIGNhbmNlbCB0aGUgY3VycmVudCBwcmVkcm9wLCBpZiBhbnlcbiAgY2FuY2VsUHJlZHJvcCgpOiB2b2lkO1xuXG4gIC8vIGNhbmNlbCB0aGUgY3VycmVudCBtb3ZlIGJlaW5nIG1hZGVcbiAgY2FuY2VsTW92ZSgpOiB2b2lkO1xuXG4gIC8vIGNhbmNlbCBjdXJyZW50IG1vdmUgYW5kIHByZXZlbnQgZnVydGhlciBvbmVzXG4gIHN0b3AoKTogdm9pZDtcblxuICAvLyBtYWtlIHNxdWFyZXMgZXhwbG9kZSAoYXRvbWljIGNoZXNzKVxuICBleHBsb2RlKGtleXM6IGNnLktleVtdKTogdm9pZDtcblxuICAvLyBwcm9ncmFtbWF0aWNhbGx5IGRyYXcgdXNlciBzaGFwZXNcbiAgc2V0U2hhcGVzKHNoYXBlczogRHJhd1NoYXBlW10pOiB2b2lkO1xuXG4gIC8vIHByb2dyYW1tYXRpY2FsbHkgZHJhdyBhdXRvIHNoYXBlc1xuICBzZXRBdXRvU2hhcGVzKHNoYXBlczogRHJhd1NoYXBlW10pOiB2b2lkO1xuXG4gIC8vIHNxdWFyZSBuYW1lIGF0IHRoaXMgRE9NIHBvc2l0aW9uIChsaWtlIFwiZTRcIilcbiAgZ2V0S2V5QXREb21Qb3MocG9zOiBjZy5OdW1iZXJQYWlyKTogY2cuS2V5IHwgdW5kZWZpbmVkO1xuXG4gIC8vIG9ubHkgdXNlZnVsIHdoZW4gQ1NTIGNoYW5nZXMgdGhlIGJvYXJkIHdpZHRoL2hlaWdodCByYXRpbyAoZm9yIDNEKVxuICByZWRyYXdBbGw6IGNnLlJlZHJhdztcblxuICAvLyBmb3IgY3Jhenlob3VzZSBhbmQgYm9hcmQgZWRpdG9yc1xuICBkcmFnTmV3UGllY2UocGllY2U6IGNnLlBpZWNlLCBldmVudDogY2cuTW91Y2hFdmVudCwgZm9yY2U/OiBib29sZWFuKTogdm9pZDtcblxuICAvLyB1bmJpbmRzIGFsbCBldmVudHNcbiAgLy8gKGltcG9ydGFudCBmb3IgZG9jdW1lbnQtd2lkZSBldmVudHMgbGlrZSBzY3JvbGwgYW5kIG1vdXNlbW92ZSlcbiAgZGVzdHJveTogY2cuVW5iaW5kXG59XG5cbi8vIHNlZSBBUEkgdHlwZXMgYW5kIGRvY3VtZW50YXRpb25zIGluIGR0cy9hcGkuZC50c1xuZXhwb3J0IGZ1bmN0aW9uIHN0YXJ0KHN0YXRlOiBTdGF0ZSwgcmVkcmF3QWxsOiBjZy5SZWRyYXcpOiBBcGkge1xuXG4gIGZ1bmN0aW9uIHRvZ2dsZU9yaWVudGF0aW9uKCkge1xuICAgIGJvYXJkLnRvZ2dsZU9yaWVudGF0aW9uKHN0YXRlKTtcbiAgICByZWRyYXdBbGwoKTtcbiAgfTtcblxuICByZXR1cm4ge1xuXG4gICAgc2V0KGNvbmZpZykge1xuICAgICAgaWYgKGNvbmZpZy5vcmllbnRhdGlvbiAmJiBjb25maWcub3JpZW50YXRpb24gIT09IHN0YXRlLm9yaWVudGF0aW9uKSB0b2dnbGVPcmllbnRhdGlvbigpO1xuICAgICAgKGNvbmZpZy5mZW4gPyBhbmltIDogcmVuZGVyKShzdGF0ZSA9PiBjb25maWd1cmUoc3RhdGUsIGNvbmZpZyksIHN0YXRlKTtcbiAgICB9LFxuXG4gICAgc3RhdGUsXG5cbiAgICBnZXRGZW46ICgpID0+IGZlbldyaXRlKHN0YXRlLnBpZWNlcywgc3RhdGUuZ2VvbWV0cnkpLFxuXG4gICAgdG9nZ2xlT3JpZW50YXRpb24sXG5cbiAgICBzZXRQaWVjZXMocGllY2VzKSB7XG4gICAgICBhbmltKHN0YXRlID0+IGJvYXJkLnNldFBpZWNlcyhzdGF0ZSwgcGllY2VzKSwgc3RhdGUpO1xuICAgIH0sXG5cbiAgICBzZWxlY3RTcXVhcmUoa2V5LCBmb3JjZSkge1xuICAgICAgaWYgKGtleSkgYW5pbShzdGF0ZSA9PiBib2FyZC5zZWxlY3RTcXVhcmUoc3RhdGUsIGtleSwgZm9yY2UpLCBzdGF0ZSk7XG4gICAgICBlbHNlIGlmIChzdGF0ZS5zZWxlY3RlZCkge1xuICAgICAgICBib2FyZC51bnNlbGVjdChzdGF0ZSk7XG4gICAgICAgIHN0YXRlLmRvbS5yZWRyYXcoKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgbW92ZShvcmlnLCBkZXN0KSB7XG4gICAgICBhbmltKHN0YXRlID0+IGJvYXJkLmJhc2VNb3ZlKHN0YXRlLCBvcmlnLCBkZXN0KSwgc3RhdGUpO1xuICAgIH0sXG5cbiAgICBuZXdQaWVjZShwaWVjZSwga2V5KSB7XG4gICAgICBhbmltKHN0YXRlID0+IGJvYXJkLmJhc2VOZXdQaWVjZShzdGF0ZSwgcGllY2UsIGtleSksIHN0YXRlKTtcbiAgICB9LFxuXG4gICAgcGxheVByZW1vdmUoKSB7XG4gICAgICBpZiAoc3RhdGUucHJlbW92YWJsZS5jdXJyZW50KSB7XG4gICAgICAgIGlmIChhbmltKGJvYXJkLnBsYXlQcmVtb3ZlLCBzdGF0ZSkpIHJldHVybiB0cnVlO1xuICAgICAgICAvLyBpZiB0aGUgcHJlbW92ZSBjb3VsZG4ndCBiZSBwbGF5ZWQsIHJlZHJhdyB0byBjbGVhciBpdCB1cFxuICAgICAgICBzdGF0ZS5kb20ucmVkcmF3KCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcblxuICAgIHBsYXlQcmVkcm9wKHZhbGlkYXRlKSB7XG4gICAgICBpZiAoc3RhdGUucHJlZHJvcHBhYmxlLmN1cnJlbnQpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYm9hcmQucGxheVByZWRyb3Aoc3RhdGUsIHZhbGlkYXRlKTtcbiAgICAgICAgc3RhdGUuZG9tLnJlZHJhdygpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG5cbiAgICBjYW5jZWxQcmVtb3ZlKCkge1xuICAgICAgcmVuZGVyKGJvYXJkLnVuc2V0UHJlbW92ZSwgc3RhdGUpO1xuICAgIH0sXG5cbiAgICBjYW5jZWxQcmVkcm9wKCkge1xuICAgICAgcmVuZGVyKGJvYXJkLnVuc2V0UHJlZHJvcCwgc3RhdGUpO1xuICAgIH0sXG5cbiAgICBjYW5jZWxNb3ZlKCkge1xuICAgICAgcmVuZGVyKHN0YXRlID0+IHsgYm9hcmQuY2FuY2VsTW92ZShzdGF0ZSk7IGRyYWdDYW5jZWwoc3RhdGUpOyB9LCBzdGF0ZSk7XG4gICAgfSxcblxuICAgIHN0b3AoKSB7XG4gICAgICByZW5kZXIoc3RhdGUgPT4geyBib2FyZC5zdG9wKHN0YXRlKTsgZHJhZ0NhbmNlbChzdGF0ZSk7IH0sIHN0YXRlKTtcbiAgICB9LFxuXG4gICAgZXhwbG9kZShrZXlzOiBjZy5LZXlbXSkge1xuICAgICAgZXhwbG9zaW9uKHN0YXRlLCBrZXlzKTtcbiAgICB9LFxuXG4gICAgc2V0QXV0b1NoYXBlcyhzaGFwZXM6IERyYXdTaGFwZVtdKSB7XG4gICAgICByZW5kZXIoc3RhdGUgPT4gc3RhdGUuZHJhd2FibGUuYXV0b1NoYXBlcyA9IHNoYXBlcywgc3RhdGUpO1xuICAgIH0sXG5cbiAgICBzZXRTaGFwZXMoc2hhcGVzOiBEcmF3U2hhcGVbXSkge1xuICAgICAgcmVuZGVyKHN0YXRlID0+IHN0YXRlLmRyYXdhYmxlLnNoYXBlcyA9IHNoYXBlcywgc3RhdGUpO1xuICAgIH0sXG5cbiAgICBnZXRLZXlBdERvbVBvcyhwb3MpIHtcbiAgICAgIHJldHVybiBib2FyZC5nZXRLZXlBdERvbVBvcyhwb3MsIGJvYXJkLndoaXRlUG92KHN0YXRlKSwgc3RhdGUuZG9tLmJvdW5kcygpLCBzdGF0ZS5nZW9tZXRyeSk7XG4gICAgfSxcblxuICAgIHJlZHJhd0FsbCxcblxuICAgIGRyYWdOZXdQaWVjZShwaWVjZSwgZXZlbnQsIGZvcmNlKSB7XG4gICAgICBkcmFnTmV3UGllY2Uoc3RhdGUsIHBpZWNlLCBldmVudCwgZm9yY2UpXG4gICAgfSxcblxuICAgIGRlc3Ryb3koKSB7XG4gICAgICBib2FyZC5zdG9wKHN0YXRlKTtcbiAgICAgIHN0YXRlLmRvbS51bmJpbmQgJiYgc3RhdGUuZG9tLnVuYmluZCgpO1xuICAgICAgc3RhdGUuZG9tLmRlc3Ryb3llZCA9IHRydWU7XG4gICAgfVxuICB9O1xufVxuIiwiaW1wb3J0IHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJ1xuaW1wb3J0IHsgcG9zMmtleSwga2V5MnBvcywgb3Bwb3NpdGUsIGNvbnRhaW5zWCB9IGZyb20gJy4vdXRpbCdcbmltcG9ydCBwcmVtb3ZlIGZyb20gJy4vcHJlbW92ZSdcbmltcG9ydCAqIGFzIGNnIGZyb20gJy4vdHlwZXMnXG5cbmV4cG9ydCB0eXBlIENhbGxiYWNrID0gKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkO1xuXG5leHBvcnQgZnVuY3Rpb24gY2FsbFVzZXJGdW5jdGlvbihmOiBDYWxsYmFjayB8IHVuZGVmaW5lZCwgLi4uYXJnczogYW55W10pOiB2b2lkIHtcbiAgaWYgKGYpIHNldFRpbWVvdXQoKCkgPT4gZiguLi5hcmdzKSwgMSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b2dnbGVPcmllbnRhdGlvbihzdGF0ZTogU3RhdGUpOiB2b2lkIHtcbiAgc3RhdGUub3JpZW50YXRpb24gPSBvcHBvc2l0ZShzdGF0ZS5vcmllbnRhdGlvbik7XG4gIHN0YXRlLmFuaW1hdGlvbi5jdXJyZW50ID1cbiAgc3RhdGUuZHJhZ2dhYmxlLmN1cnJlbnQgPVxuICBzdGF0ZS5zZWxlY3RlZCA9IHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc2V0KHN0YXRlOiBTdGF0ZSk6IHZvaWQge1xuICBzdGF0ZS5sYXN0TW92ZSA9IHVuZGVmaW5lZDtcbiAgdW5zZWxlY3Qoc3RhdGUpO1xuICB1bnNldFByZW1vdmUoc3RhdGUpO1xuICB1bnNldFByZWRyb3Aoc3RhdGUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0UGllY2VzKHN0YXRlOiBTdGF0ZSwgcGllY2VzOiBjZy5QaWVjZXNEaWZmKTogdm9pZCB7XG4gIGZvciAobGV0IGtleSBpbiBwaWVjZXMpIHtcbiAgICBjb25zdCBwaWVjZSA9IHBpZWNlc1trZXldO1xuICAgIGlmIChwaWVjZSkgc3RhdGUucGllY2VzW2tleV0gPSBwaWVjZTtcbiAgICBlbHNlIGRlbGV0ZSBzdGF0ZS5waWVjZXNba2V5XTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0Q2hlY2soc3RhdGU6IFN0YXRlLCBjb2xvcjogY2cuQ29sb3IgfCBib29sZWFuKTogdm9pZCB7XG4gIHN0YXRlLmNoZWNrID0gdW5kZWZpbmVkO1xuICBpZiAoY29sb3IgPT09IHRydWUpIGNvbG9yID0gc3RhdGUudHVybkNvbG9yO1xuICBpZiAoY29sb3IpIGZvciAobGV0IGsgaW4gc3RhdGUucGllY2VzKSB7XG4gICAgaWYgKHN0YXRlLnBpZWNlc1trXSEucm9sZSA9PT0gJ2tpbmcnICYmIHN0YXRlLnBpZWNlc1trXSEuY29sb3IgPT09IGNvbG9yKSB7XG4gICAgICBzdGF0ZS5jaGVjayA9IGsgYXMgY2cuS2V5O1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBzZXRQcmVtb3ZlKHN0YXRlOiBTdGF0ZSwgb3JpZzogY2cuS2V5LCBkZXN0OiBjZy5LZXksIG1ldGE6IGNnLlNldFByZW1vdmVNZXRhZGF0YSk6IHZvaWQge1xuICB1bnNldFByZWRyb3Aoc3RhdGUpO1xuICBzdGF0ZS5wcmVtb3ZhYmxlLmN1cnJlbnQgPSBbb3JpZywgZGVzdF07XG4gIGNhbGxVc2VyRnVuY3Rpb24oc3RhdGUucHJlbW92YWJsZS5ldmVudHMuc2V0LCBvcmlnLCBkZXN0LCBtZXRhKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVuc2V0UHJlbW92ZShzdGF0ZTogU3RhdGUpOiB2b2lkIHtcbiAgaWYgKHN0YXRlLnByZW1vdmFibGUuY3VycmVudCkge1xuICAgIHN0YXRlLnByZW1vdmFibGUuY3VycmVudCA9IHVuZGVmaW5lZDtcbiAgICBjYWxsVXNlckZ1bmN0aW9uKHN0YXRlLnByZW1vdmFibGUuZXZlbnRzLnVuc2V0KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzZXRQcmVkcm9wKHN0YXRlOiBTdGF0ZSwgcm9sZTogY2cuUm9sZSwga2V5OiBjZy5LZXkpOiB2b2lkIHtcbiAgdW5zZXRQcmVtb3ZlKHN0YXRlKTtcbiAgc3RhdGUucHJlZHJvcHBhYmxlLmN1cnJlbnQgPSB7IHJvbGUsIGtleSB9O1xuICBjYWxsVXNlckZ1bmN0aW9uKHN0YXRlLnByZWRyb3BwYWJsZS5ldmVudHMuc2V0LCByb2xlLCBrZXkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdW5zZXRQcmVkcm9wKHN0YXRlOiBTdGF0ZSk6IHZvaWQge1xuICBjb25zdCBwZCA9IHN0YXRlLnByZWRyb3BwYWJsZTtcbiAgaWYgKHBkLmN1cnJlbnQpIHtcbiAgICBwZC5jdXJyZW50ID0gdW5kZWZpbmVkO1xuICAgIGNhbGxVc2VyRnVuY3Rpb24ocGQuZXZlbnRzLnVuc2V0KTtcbiAgfVxufVxuXG5mdW5jdGlvbiB0cnlBdXRvQ2FzdGxlKHN0YXRlOiBTdGF0ZSwgb3JpZzogY2cuS2V5LCBkZXN0OiBjZy5LZXkpOiBib29sZWFuIHtcbiAgaWYgKCFzdGF0ZS5hdXRvQ2FzdGxlKSByZXR1cm4gZmFsc2U7XG4gIGNvbnN0IGtpbmcgPSBzdGF0ZS5waWVjZXNbb3JpZ107XG4gIGlmICgha2luZyB8fCBraW5nLnJvbGUgIT09ICdraW5nJykgcmV0dXJuIGZhbHNlO1xuICBjb25zdCBmaXJzdFJhbmtJczAgPSBzdGF0ZS5kaW1lbnNpb25zLmhlaWdodCA9PT0gMTA7XG4gIGNvbnN0IG9yaWdQb3MgPSBrZXkycG9zKG9yaWcsIGZpcnN0UmFua0lzMCk7XG4gIGlmIChvcmlnUG9zWzBdICE9PSA1KSByZXR1cm4gZmFsc2U7XG4gIGlmIChvcmlnUG9zWzFdICE9PSAxICYmIG9yaWdQb3NbMV0gIT09IDgpIHJldHVybiBmYWxzZTtcbiAgY29uc3QgZGVzdFBvcyA9IGtleTJwb3MoZGVzdCwgZmlyc3RSYW5rSXMwKTtcbiAgbGV0IG9sZFJvb2tQb3MsIG5ld1Jvb2tQb3MsIG5ld0tpbmdQb3M7XG4gIGlmIChkZXN0UG9zWzBdID09PSA3IHx8IGRlc3RQb3NbMF0gPT09IDgpIHtcbiAgICBvbGRSb29rUG9zID0gcG9zMmtleShbOCwgb3JpZ1Bvc1sxXV0sIHN0YXRlLmdlb21ldHJ5KTtcbiAgICBuZXdSb29rUG9zID0gcG9zMmtleShbNiwgb3JpZ1Bvc1sxXV0sIHN0YXRlLmdlb21ldHJ5KTtcbiAgICBuZXdLaW5nUG9zID0gcG9zMmtleShbNywgb3JpZ1Bvc1sxXV0sIHN0YXRlLmdlb21ldHJ5KTtcbiAgfSBlbHNlIGlmIChkZXN0UG9zWzBdID09PSAzIHx8IGRlc3RQb3NbMF0gPT09IDEpIHtcbiAgICBvbGRSb29rUG9zID0gcG9zMmtleShbMSwgb3JpZ1Bvc1sxXV0sIHN0YXRlLmdlb21ldHJ5KTtcbiAgICBuZXdSb29rUG9zID0gcG9zMmtleShbNCwgb3JpZ1Bvc1sxXV0sIHN0YXRlLmdlb21ldHJ5KTtcbiAgICBuZXdLaW5nUG9zID0gcG9zMmtleShbMywgb3JpZ1Bvc1sxXV0sIHN0YXRlLmdlb21ldHJ5KTtcbiAgfSBlbHNlIHJldHVybiBmYWxzZTtcblxuICBjb25zdCByb29rID0gc3RhdGUucGllY2VzW29sZFJvb2tQb3NdO1xuICBpZiAoIXJvb2sgfHwgcm9vay5yb2xlICE9PSAncm9vaycpIHJldHVybiBmYWxzZTtcblxuICBkZWxldGUgc3RhdGUucGllY2VzW29yaWddO1xuICBkZWxldGUgc3RhdGUucGllY2VzW29sZFJvb2tQb3NdO1xuXG4gIHN0YXRlLnBpZWNlc1tuZXdLaW5nUG9zXSA9IGtpbmdcbiAgc3RhdGUucGllY2VzW25ld1Jvb2tQb3NdID0gcm9vaztcbiAgcmV0dXJuIHRydWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBiYXNlTW92ZShzdGF0ZTogU3RhdGUsIG9yaWc6IGNnLktleSwgZGVzdDogY2cuS2V5KTogY2cuUGllY2UgfCBib29sZWFuIHtcbiAgY29uc3Qgb3JpZ1BpZWNlID0gc3RhdGUucGllY2VzW29yaWddLCBkZXN0UGllY2UgPSBzdGF0ZS5waWVjZXNbZGVzdF07XG4gIGlmIChvcmlnID09PSBkZXN0IHx8ICFvcmlnUGllY2UpIHJldHVybiBmYWxzZTtcbiAgY29uc3QgY2FwdHVyZWQgPSAoZGVzdFBpZWNlICYmIGRlc3RQaWVjZS5jb2xvciAhPT0gb3JpZ1BpZWNlLmNvbG9yKSA/IGRlc3RQaWVjZSA6IHVuZGVmaW5lZDtcbiAgaWYgKGRlc3QgPT0gc3RhdGUuc2VsZWN0ZWQpIHVuc2VsZWN0KHN0YXRlKTtcbiAgY2FsbFVzZXJGdW5jdGlvbihzdGF0ZS5ldmVudHMubW92ZSwgb3JpZywgZGVzdCwgY2FwdHVyZWQpO1xuICBpZiAoIXRyeUF1dG9DYXN0bGUoc3RhdGUsIG9yaWcsIGRlc3QpKSB7XG4gICAgc3RhdGUucGllY2VzW2Rlc3RdID0gb3JpZ1BpZWNlO1xuICAgIGRlbGV0ZSBzdGF0ZS5waWVjZXNbb3JpZ107XG4gIH1cbiAgc3RhdGUubGFzdE1vdmUgPSBbb3JpZywgZGVzdF07XG4gIHN0YXRlLmNoZWNrID0gdW5kZWZpbmVkO1xuICBjYWxsVXNlckZ1bmN0aW9uKHN0YXRlLmV2ZW50cy5jaGFuZ2UpO1xuICByZXR1cm4gY2FwdHVyZWQgfHwgdHJ1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJhc2VOZXdQaWVjZShzdGF0ZTogU3RhdGUsIHBpZWNlOiBjZy5QaWVjZSwga2V5OiBjZy5LZXksIGZvcmNlPzogYm9vbGVhbik6IGJvb2xlYW4ge1xuICBpZiAoc3RhdGUucGllY2VzW2tleV0pIHtcbiAgICBpZiAoZm9yY2UpIGRlbGV0ZSBzdGF0ZS5waWVjZXNba2V5XTtcbiAgICBlbHNlIHJldHVybiBmYWxzZTtcbiAgfVxuICBjYWxsVXNlckZ1bmN0aW9uKHN0YXRlLmV2ZW50cy5kcm9wTmV3UGllY2UsIHBpZWNlLCBrZXkpO1xuICBzdGF0ZS5waWVjZXNba2V5XSA9IHBpZWNlO1xuICBzdGF0ZS5sYXN0TW92ZSA9IFtrZXldO1xuICBzdGF0ZS5jaGVjayA9IHVuZGVmaW5lZDtcbiAgY2FsbFVzZXJGdW5jdGlvbihzdGF0ZS5ldmVudHMuY2hhbmdlKTtcbiAgc3RhdGUubW92YWJsZS5kZXN0cyA9IHVuZGVmaW5lZDtcbiAgc3RhdGUudHVybkNvbG9yID0gb3Bwb3NpdGUoc3RhdGUudHVybkNvbG9yKTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGJhc2VVc2VyTW92ZShzdGF0ZTogU3RhdGUsIG9yaWc6IGNnLktleSwgZGVzdDogY2cuS2V5KTogY2cuUGllY2UgfCBib29sZWFuIHtcbiAgY29uc3QgcmVzdWx0ID0gYmFzZU1vdmUoc3RhdGUsIG9yaWcsIGRlc3QpO1xuICBpZiAocmVzdWx0KSB7XG4gICAgc3RhdGUubW92YWJsZS5kZXN0cyA9IHVuZGVmaW5lZDtcbiAgICBzdGF0ZS50dXJuQ29sb3IgPSBvcHBvc2l0ZShzdGF0ZS50dXJuQ29sb3IpO1xuICAgIHN0YXRlLmFuaW1hdGlvbi5jdXJyZW50ID0gdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB1c2VyTW92ZShzdGF0ZTogU3RhdGUsIG9yaWc6IGNnLktleSwgZGVzdDogY2cuS2V5KTogYm9vbGVhbiB7XG4gIGlmIChjYW5Nb3ZlKHN0YXRlLCBvcmlnLCBkZXN0KSkge1xuICAgIGNvbnN0IHJlc3VsdCA9IGJhc2VVc2VyTW92ZShzdGF0ZSwgb3JpZywgZGVzdCk7XG4gICAgaWYgKHJlc3VsdCkge1xuICAgICAgY29uc3QgaG9sZFRpbWUgPSBzdGF0ZS5ob2xkLnN0b3AoKTtcbiAgICAgIHVuc2VsZWN0KHN0YXRlKTtcbiAgICAgIGNvbnN0IG1ldGFkYXRhOiBjZy5Nb3ZlTWV0YWRhdGEgPSB7XG4gICAgICAgIHByZW1vdmU6IGZhbHNlLFxuICAgICAgICBjdHJsS2V5OiBzdGF0ZS5zdGF0cy5jdHJsS2V5LFxuICAgICAgICBob2xkVGltZVxuICAgICAgfTtcbiAgICAgIGlmIChyZXN1bHQgIT09IHRydWUpIG1ldGFkYXRhLmNhcHR1cmVkID0gcmVzdWx0O1xuICAgICAgY2FsbFVzZXJGdW5jdGlvbihzdGF0ZS5tb3ZhYmxlLmV2ZW50cy5hZnRlciwgb3JpZywgZGVzdCwgbWV0YWRhdGEpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9IGVsc2UgaWYgKGNhblByZW1vdmUoc3RhdGUsIG9yaWcsIGRlc3QpKSB7XG4gICAgc2V0UHJlbW92ZShzdGF0ZSwgb3JpZywgZGVzdCwge1xuICAgICAgY3RybEtleTogc3RhdGUuc3RhdHMuY3RybEtleVxuICAgIH0pO1xuICAgIHVuc2VsZWN0KHN0YXRlKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICB1bnNlbGVjdChzdGF0ZSk7XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRyb3BOZXdQaWVjZShzdGF0ZTogU3RhdGUsIG9yaWc6IGNnLktleSwgZGVzdDogY2cuS2V5LCBmb3JjZT86IGJvb2xlYW4pOiB2b2lkIHtcbiAgaWYgKGNhbkRyb3Aoc3RhdGUsIG9yaWcsIGRlc3QpIHx8IGZvcmNlKSB7XG4gICAgY29uc3QgcGllY2UgPSBzdGF0ZS5waWVjZXNbb3JpZ10hO1xuICAgIGRlbGV0ZSBzdGF0ZS5waWVjZXNbb3JpZ107XG4gICAgYmFzZU5ld1BpZWNlKHN0YXRlLCBwaWVjZSwgZGVzdCwgZm9yY2UpO1xuICAgIGNhbGxVc2VyRnVuY3Rpb24oc3RhdGUubW92YWJsZS5ldmVudHMuYWZ0ZXJOZXdQaWVjZSwgcGllY2Uucm9sZSwgZGVzdCwge1xuICAgICAgcHJlZHJvcDogZmFsc2VcbiAgICB9KTtcbiAgfSBlbHNlIGlmIChjYW5QcmVkcm9wKHN0YXRlLCBvcmlnLCBkZXN0KSkge1xuICAgIHNldFByZWRyb3Aoc3RhdGUsIHN0YXRlLnBpZWNlc1tvcmlnXSEucm9sZSwgZGVzdCk7XG4gIH0gZWxzZSB7XG4gICAgdW5zZXRQcmVtb3ZlKHN0YXRlKTtcbiAgICB1bnNldFByZWRyb3Aoc3RhdGUpO1xuICB9XG4gIGRlbGV0ZSBzdGF0ZS5waWVjZXNbb3JpZ107XG4gIHVuc2VsZWN0KHN0YXRlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlbGVjdFNxdWFyZShzdGF0ZTogU3RhdGUsIGtleTogY2cuS2V5LCBmb3JjZT86IGJvb2xlYW4pOiB2b2lkIHtcbiAgY2FsbFVzZXJGdW5jdGlvbihzdGF0ZS5ldmVudHMuc2VsZWN0LCBrZXkpO1xuICBpZiAoc3RhdGUuc2VsZWN0ZWQpIHtcbiAgICBpZiAoc3RhdGUuc2VsZWN0ZWQgPT09IGtleSAmJiAhc3RhdGUuZHJhZ2dhYmxlLmVuYWJsZWQpIHtcbiAgICAgIHVuc2VsZWN0KHN0YXRlKTtcbiAgICAgIHN0YXRlLmhvbGQuY2FuY2VsKCk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmICgoc3RhdGUuc2VsZWN0YWJsZS5lbmFibGVkIHx8IGZvcmNlKSAmJiBzdGF0ZS5zZWxlY3RlZCAhPT0ga2V5KSB7XG4gICAgICBpZiAodXNlck1vdmUoc3RhdGUsIHN0YXRlLnNlbGVjdGVkLCBrZXkpKSB7XG4gICAgICAgIHN0YXRlLnN0YXRzLmRyYWdnZWQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAoaXNNb3ZhYmxlKHN0YXRlLCBrZXkpIHx8IGlzUHJlbW92YWJsZShzdGF0ZSwga2V5KSkge1xuICAgIHNldFNlbGVjdGVkKHN0YXRlLCBrZXkpO1xuICAgIHN0YXRlLmhvbGQuc3RhcnQoKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0U2VsZWN0ZWQoc3RhdGU6IFN0YXRlLCBrZXk6IGNnLktleSk6IHZvaWQge1xuICBzdGF0ZS5zZWxlY3RlZCA9IGtleTtcbiAgaWYgKGlzUHJlbW92YWJsZShzdGF0ZSwga2V5KSkge1xuICAgIHN0YXRlLnByZW1vdmFibGUuZGVzdHMgPSBwcmVtb3ZlKHN0YXRlLnBpZWNlcywga2V5LCBzdGF0ZS5wcmVtb3ZhYmxlLmNhc3RsZSwgc3RhdGUuZ2VvbWV0cnkpO1xuICB9XG4gIGVsc2Ugc3RhdGUucHJlbW92YWJsZS5kZXN0cyA9IHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVuc2VsZWN0KHN0YXRlOiBTdGF0ZSk6IHZvaWQge1xuICBzdGF0ZS5zZWxlY3RlZCA9IHVuZGVmaW5lZDtcbiAgc3RhdGUucHJlbW92YWJsZS5kZXN0cyA9IHVuZGVmaW5lZDtcbiAgc3RhdGUuaG9sZC5jYW5jZWwoKTtcbn1cblxuZnVuY3Rpb24gaXNNb3ZhYmxlKHN0YXRlOiBTdGF0ZSwgb3JpZzogY2cuS2V5KTogYm9vbGVhbiB7XG4gIGNvbnN0IHBpZWNlID0gc3RhdGUucGllY2VzW29yaWddO1xuICByZXR1cm4gISFwaWVjZSAmJiAoXG4gICAgc3RhdGUubW92YWJsZS5jb2xvciA9PT0gJ2JvdGgnIHx8IChcbiAgICAgIHN0YXRlLm1vdmFibGUuY29sb3IgPT09IHBpZWNlLmNvbG9yICYmXG4gICAgICAgIHN0YXRlLnR1cm5Db2xvciA9PT0gcGllY2UuY29sb3JcbiAgICApKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbk1vdmUoc3RhdGU6IFN0YXRlLCBvcmlnOiBjZy5LZXksIGRlc3Q6IGNnLktleSk6IGJvb2xlYW4ge1xuICByZXR1cm4gb3JpZyAhPT0gZGVzdCAmJiBpc01vdmFibGUoc3RhdGUsIG9yaWcpICYmIChcbiAgICBzdGF0ZS5tb3ZhYmxlLmZyZWUgfHwgKCEhc3RhdGUubW92YWJsZS5kZXN0cyAmJiBjb250YWluc1goc3RhdGUubW92YWJsZS5kZXN0c1tvcmlnXSwgZGVzdCkpXG4gICk7XG59XG5cbmZ1bmN0aW9uIGNhbkRyb3Aoc3RhdGU6IFN0YXRlLCBvcmlnOiBjZy5LZXksIGRlc3Q6IGNnLktleSk6IGJvb2xlYW4ge1xuICBjb25zdCBwaWVjZSA9IHN0YXRlLnBpZWNlc1tvcmlnXTtcbiAgcmV0dXJuICEhcGllY2UgJiYgZGVzdCAmJiAob3JpZyA9PT0gZGVzdCB8fCAhc3RhdGUucGllY2VzW2Rlc3RdKSAmJiAoXG4gICAgc3RhdGUubW92YWJsZS5jb2xvciA9PT0gJ2JvdGgnIHx8IChcbiAgICAgIHN0YXRlLm1vdmFibGUuY29sb3IgPT09IHBpZWNlLmNvbG9yICYmXG4gICAgICAgIHN0YXRlLnR1cm5Db2xvciA9PT0gcGllY2UuY29sb3JcbiAgICApKTtcbn1cblxuXG5mdW5jdGlvbiBpc1ByZW1vdmFibGUoc3RhdGU6IFN0YXRlLCBvcmlnOiBjZy5LZXkpOiBib29sZWFuIHtcbiAgY29uc3QgcGllY2UgPSBzdGF0ZS5waWVjZXNbb3JpZ107XG4gIHJldHVybiAhIXBpZWNlICYmIHN0YXRlLnByZW1vdmFibGUuZW5hYmxlZCAmJlxuICBzdGF0ZS5tb3ZhYmxlLmNvbG9yID09PSBwaWVjZS5jb2xvciAmJlxuICAgIHN0YXRlLnR1cm5Db2xvciAhPT0gcGllY2UuY29sb3I7XG59XG5cbmZ1bmN0aW9uIGNhblByZW1vdmUoc3RhdGU6IFN0YXRlLCBvcmlnOiBjZy5LZXksIGRlc3Q6IGNnLktleSk6IGJvb2xlYW4ge1xuICByZXR1cm4gb3JpZyAhPT0gZGVzdCAmJlxuICBpc1ByZW1vdmFibGUoc3RhdGUsIG9yaWcpICYmXG4gIGNvbnRhaW5zWChwcmVtb3ZlKHN0YXRlLnBpZWNlcywgb3JpZywgc3RhdGUucHJlbW92YWJsZS5jYXN0bGUsIHN0YXRlLmdlb21ldHJ5KSwgZGVzdCk7XG59XG5cbmZ1bmN0aW9uIGNhblByZWRyb3Aoc3RhdGU6IFN0YXRlLCBvcmlnOiBjZy5LZXksIGRlc3Q6IGNnLktleSk6IGJvb2xlYW4ge1xuICBjb25zdCBwaWVjZSA9IHN0YXRlLnBpZWNlc1tvcmlnXTtcbiAgY29uc3QgZGVzdFBpZWNlID0gc3RhdGUucGllY2VzW2Rlc3RdO1xuICByZXR1cm4gISFwaWVjZSAmJiBkZXN0ICYmXG4gICghZGVzdFBpZWNlIHx8IGRlc3RQaWVjZS5jb2xvciAhPT0gc3RhdGUubW92YWJsZS5jb2xvcikgJiZcbiAgc3RhdGUucHJlZHJvcHBhYmxlLmVuYWJsZWQgJiZcbiAgKHBpZWNlLnJvbGUgIT09ICdwYXduJyB8fCAoZGVzdFsxXSAhPT0gJzEnICYmIGRlc3RbMV0gIT09ICc4JykpICYmXG4gIHN0YXRlLm1vdmFibGUuY29sb3IgPT09IHBpZWNlLmNvbG9yICYmXG4gICAgc3RhdGUudHVybkNvbG9yICE9PSBwaWVjZS5jb2xvcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzRHJhZ2dhYmxlKHN0YXRlOiBTdGF0ZSwgb3JpZzogY2cuS2V5KTogYm9vbGVhbiB7XG4gIGNvbnN0IHBpZWNlID0gc3RhdGUucGllY2VzW29yaWddO1xuICByZXR1cm4gISFwaWVjZSAmJiBzdGF0ZS5kcmFnZ2FibGUuZW5hYmxlZCAmJiAoXG4gICAgc3RhdGUubW92YWJsZS5jb2xvciA9PT0gJ2JvdGgnIHx8IChcbiAgICAgIHN0YXRlLm1vdmFibGUuY29sb3IgPT09IHBpZWNlLmNvbG9yICYmIChcbiAgICAgICAgc3RhdGUudHVybkNvbG9yID09PSBwaWVjZS5jb2xvciB8fCBzdGF0ZS5wcmVtb3ZhYmxlLmVuYWJsZWRcbiAgICAgIClcbiAgICApXG4gICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwbGF5UHJlbW92ZShzdGF0ZTogU3RhdGUpOiBib29sZWFuIHtcbiAgY29uc3QgbW92ZSA9IHN0YXRlLnByZW1vdmFibGUuY3VycmVudDtcbiAgaWYgKCFtb3ZlKSByZXR1cm4gZmFsc2U7XG4gIGNvbnN0IG9yaWcgPSBtb3ZlWzBdLCBkZXN0ID0gbW92ZVsxXTtcbiAgbGV0IHN1Y2Nlc3MgPSBmYWxzZTtcbiAgaWYgKGNhbk1vdmUoc3RhdGUsIG9yaWcsIGRlc3QpKSB7XG4gICAgY29uc3QgcmVzdWx0ID0gYmFzZVVzZXJNb3ZlKHN0YXRlLCBvcmlnLCBkZXN0KTtcbiAgICBpZiAocmVzdWx0KSB7XG4gICAgICBjb25zdCBtZXRhZGF0YTogY2cuTW92ZU1ldGFkYXRhID0geyBwcmVtb3ZlOiB0cnVlIH07XG4gICAgICBpZiAocmVzdWx0ICE9PSB0cnVlKSBtZXRhZGF0YS5jYXB0dXJlZCA9IHJlc3VsdDtcbiAgICAgIGNhbGxVc2VyRnVuY3Rpb24oc3RhdGUubW92YWJsZS5ldmVudHMuYWZ0ZXIsIG9yaWcsIGRlc3QsIG1ldGFkYXRhKTtcbiAgICAgIHN1Y2Nlc3MgPSB0cnVlO1xuICAgIH1cbiAgfVxuICB1bnNldFByZW1vdmUoc3RhdGUpO1xuICByZXR1cm4gc3VjY2Vzcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBsYXlQcmVkcm9wKHN0YXRlOiBTdGF0ZSwgdmFsaWRhdGU6IChkcm9wOiBjZy5Ecm9wKSA9PiBib29sZWFuKTogYm9vbGVhbiB7XG4gIGxldCBkcm9wID0gc3RhdGUucHJlZHJvcHBhYmxlLmN1cnJlbnQsXG4gIHN1Y2Nlc3MgPSBmYWxzZTtcbiAgaWYgKCFkcm9wKSByZXR1cm4gZmFsc2U7XG4gIGlmICh2YWxpZGF0ZShkcm9wKSkge1xuICAgIGNvbnN0IHBpZWNlID0ge1xuICAgICAgcm9sZTogZHJvcC5yb2xlLFxuICAgICAgY29sb3I6IHN0YXRlLm1vdmFibGUuY29sb3JcbiAgICB9IGFzIGNnLlBpZWNlO1xuICAgIGlmIChiYXNlTmV3UGllY2Uoc3RhdGUsIHBpZWNlLCBkcm9wLmtleSkpIHtcbiAgICAgIGNhbGxVc2VyRnVuY3Rpb24oc3RhdGUubW92YWJsZS5ldmVudHMuYWZ0ZXJOZXdQaWVjZSwgZHJvcC5yb2xlLCBkcm9wLmtleSwge1xuICAgICAgICBwcmVkcm9wOiB0cnVlXG4gICAgICB9KTtcbiAgICAgIHN1Y2Nlc3MgPSB0cnVlO1xuICAgIH1cbiAgfVxuICB1bnNldFByZWRyb3Aoc3RhdGUpO1xuICByZXR1cm4gc3VjY2Vzcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbmNlbE1vdmUoc3RhdGU6IFN0YXRlKTogdm9pZCB7XG4gIHVuc2V0UHJlbW92ZShzdGF0ZSk7XG4gIHVuc2V0UHJlZHJvcChzdGF0ZSk7XG4gIHVuc2VsZWN0KHN0YXRlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0b3Aoc3RhdGU6IFN0YXRlKTogdm9pZCB7XG4gIHN0YXRlLm1vdmFibGUuY29sb3IgPVxuICBzdGF0ZS5tb3ZhYmxlLmRlc3RzID1cbiAgc3RhdGUuYW5pbWF0aW9uLmN1cnJlbnQgPSB1bmRlZmluZWQ7XG4gIGNhbmNlbE1vdmUoc3RhdGUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0S2V5QXREb21Qb3MocG9zOiBjZy5OdW1iZXJQYWlyLCBhc1doaXRlOiBib29sZWFuLCBib3VuZHM6IENsaWVudFJlY3QsIGdlb206IGNnLkdlb21ldHJ5KTogY2cuS2V5IHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgYmQgPSBjZy5kaW1lbnNpb25zW2dlb21dO1xuICBsZXQgZmlsZSA9IE1hdGguY2VpbChiZC53aWR0aCAqICgocG9zWzBdIC0gYm91bmRzLmxlZnQpIC8gYm91bmRzLndpZHRoKSk7XG4gIGlmICghYXNXaGl0ZSkgZmlsZSA9IGJkLndpZHRoICsgMSAtIGZpbGU7XG4gIGxldCByYW5rID0gTWF0aC5jZWlsKGJkLmhlaWdodCAtIChiZC5oZWlnaHQgKiAoKHBvc1sxXSAtIGJvdW5kcy50b3ApIC8gYm91bmRzLmhlaWdodCkpKTtcbiAgaWYgKCFhc1doaXRlKSByYW5rID0gYmQuaGVpZ2h0ICsgMSAtIHJhbms7XG4gIHJldHVybiAoZmlsZSA+IDAgJiYgZmlsZSA8IGJkLndpZHRoICsgMSAmJiByYW5rID4gMCAmJiByYW5rIDwgYmQuaGVpZ2h0ICsgMSkgPyBwb3Mya2V5KFtmaWxlLCByYW5rXSwgZ2VvbSkgOiB1bmRlZmluZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3aGl0ZVBvdihzOiBTdGF0ZSk6IGJvb2xlYW4ge1xuICByZXR1cm4gcy5vcmllbnRhdGlvbiA9PT0gJ3doaXRlJztcbn1cbiIsImltcG9ydCB7IEFwaSwgc3RhcnQgfSBmcm9tICcuL2FwaSdcbmltcG9ydCB7IENvbmZpZywgY29uZmlndXJlIH0gZnJvbSAnLi9jb25maWcnXG5pbXBvcnQgeyBTdGF0ZSwgZGVmYXVsdHMgfSBmcm9tICcuL3N0YXRlJ1xuXG5pbXBvcnQgcmVuZGVyV3JhcCBmcm9tICcuL3dyYXAnO1xuaW1wb3J0ICogYXMgZXZlbnRzIGZyb20gJy4vZXZlbnRzJ1xuaW1wb3J0IHJlbmRlciBmcm9tICcuL3JlbmRlcic7XG5pbXBvcnQgKiBhcyBzdmcgZnJvbSAnLi9zdmcnO1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgZnVuY3Rpb24gQ2hlc3Nncm91bmQoZWxlbWVudDogSFRNTEVsZW1lbnQsIGNvbmZpZz86IENvbmZpZyk6IEFwaSB7XG5cbiAgY29uc3Qgc3RhdGUgPSBkZWZhdWx0cygpIGFzIFN0YXRlO1xuXG4gIGNvbmZpZ3VyZShzdGF0ZSwgY29uZmlnIHx8IHt9KTtcblxuICBmdW5jdGlvbiByZWRyYXdBbGwoKSB7XG4gICAgbGV0IHByZXZVbmJpbmQgPSBzdGF0ZS5kb20gJiYgc3RhdGUuZG9tLnVuYmluZDtcbiAgICAvLyBjb21wdXRlIGJvdW5kcyBmcm9tIGV4aXN0aW5nIGJvYXJkIGVsZW1lbnQgaWYgcG9zc2libGVcbiAgICAvLyB0aGlzIGFsbG93cyBub24tc3F1YXJlIGJvYXJkcyBmcm9tIENTUyB0byBiZSBoYW5kbGVkIChmb3IgM0QpXG4gICAgY29uc3QgcmVsYXRpdmUgPSBzdGF0ZS52aWV3T25seSAmJiAhc3RhdGUuZHJhd2FibGUudmlzaWJsZSxcbiAgICBlbGVtZW50cyA9IHJlbmRlcldyYXAoZWxlbWVudCwgc3RhdGUsIHJlbGF0aXZlKSxcbiAgICBib3VuZHMgPSB1dGlsLm1lbW8oKCkgPT4gZWxlbWVudHMuYm9hcmQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkpLFxuICAgIHJlZHJhd05vdyA9IChza2lwU3ZnPzogYm9vbGVhbikgPT4ge1xuICAgICAgcmVuZGVyKHN0YXRlKTtcbiAgICAgIGlmICghc2tpcFN2ZyAmJiBlbGVtZW50cy5zdmcpIHN2Zy5yZW5kZXJTdmcoc3RhdGUsIGVsZW1lbnRzLnN2Zyk7XG4gICAgfTtcbiAgICBzdGF0ZS5kb20gPSB7XG4gICAgICBlbGVtZW50cyxcbiAgICAgIGJvdW5kcyxcbiAgICAgIHJlZHJhdzogZGVib3VuY2VSZWRyYXcocmVkcmF3Tm93KSxcbiAgICAgIHJlZHJhd05vdyxcbiAgICAgIHVuYmluZDogcHJldlVuYmluZCxcbiAgICAgIHJlbGF0aXZlXG4gICAgfTtcbiAgICBzdGF0ZS5kcmF3YWJsZS5wcmV2U3ZnSGFzaCA9ICcnO1xuICAgIHJlZHJhd05vdyhmYWxzZSk7XG4gICAgZXZlbnRzLmJpbmRCb2FyZChzdGF0ZSk7XG4gICAgaWYgKCFwcmV2VW5iaW5kKSBzdGF0ZS5kb20udW5iaW5kID0gZXZlbnRzLmJpbmREb2N1bWVudChzdGF0ZSwgcmVkcmF3QWxsKTtcbiAgICBzdGF0ZS5ldmVudHMuaW5zZXJ0ICYmIHN0YXRlLmV2ZW50cy5pbnNlcnQoZWxlbWVudHMpO1xuICB9XG4gIHJlZHJhd0FsbCgpO1xuXG4gIHJldHVybiBzdGFydChzdGF0ZSwgcmVkcmF3QWxsKTtcbn07XG5cbmZ1bmN0aW9uIGRlYm91bmNlUmVkcmF3KHJlZHJhd05vdzogKHNraXBTdmc/OiBib29sZWFuKSA9PiB2b2lkKTogKCkgPT4gdm9pZCB7XG4gIGxldCByZWRyYXdpbmcgPSBmYWxzZTtcbiAgcmV0dXJuICgpID0+IHtcbiAgICBpZiAocmVkcmF3aW5nKSByZXR1cm47XG4gICAgcmVkcmF3aW5nID0gdHJ1ZTtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgcmVkcmF3Tm93KCk7XG4gICAgICByZWRyYXdpbmcgPSBmYWxzZTtcbiAgICB9KTtcbiAgfTtcbn1cbiIsImltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSdcbmltcG9ydCB7IHNldENoZWNrLCBzZXRTZWxlY3RlZCB9IGZyb20gJy4vYm9hcmQnXG5pbXBvcnQgeyByZWFkIGFzIGZlblJlYWQgfSBmcm9tICcuL2ZlbidcbmltcG9ydCB7IERyYXdTaGFwZSwgRHJhd0JydXNoIH0gZnJvbSAnLi9kcmF3J1xuaW1wb3J0ICogYXMgY2cgZnJvbSAnLi90eXBlcydcblxuZXhwb3J0IGludGVyZmFjZSBDb25maWcge1xuICBmZW4/OiBjZy5GRU47IC8vIGNoZXNzIHBvc2l0aW9uIGluIEZvcnN5dGggbm90YXRpb25cbiAgb3JpZW50YXRpb24/OiBjZy5Db2xvcjsgLy8gYm9hcmQgb3JpZW50YXRpb24uIHdoaXRlIHwgYmxhY2tcbiAgdHVybkNvbG9yPzogY2cuQ29sb3I7IC8vIHR1cm4gdG8gcGxheS4gd2hpdGUgfCBibGFja1xuICBjaGVjaz86IGNnLkNvbG9yIHwgYm9vbGVhbjsgLy8gdHJ1ZSBmb3IgY3VycmVudCBjb2xvciwgZmFsc2UgdG8gdW5zZXRcbiAgbGFzdE1vdmU/OiBjZy5LZXlbXTsgLy8gc3F1YXJlcyBwYXJ0IG9mIHRoZSBsYXN0IG1vdmUgW1wiYzNcIiwgXCJjNFwiXVxuICBzZWxlY3RlZD86IGNnLktleTsgLy8gc3F1YXJlIGN1cnJlbnRseSBzZWxlY3RlZCBcImExXCJcbiAgY29vcmRpbmF0ZXM/OiBib29sZWFuOyAvLyBpbmNsdWRlIGNvb3JkcyBhdHRyaWJ1dGVzXG4gIGF1dG9DYXN0bGU/OiBib29sZWFuOyAvLyBpbW1lZGlhdGVseSBjb21wbGV0ZSB0aGUgY2FzdGxlIGJ5IG1vdmluZyB0aGUgcm9vayBhZnRlciBraW5nIG1vdmVcbiAgdmlld09ubHk/OiBib29sZWFuOyAvLyBkb24ndCBiaW5kIGV2ZW50czogdGhlIHVzZXIgd2lsbCBuZXZlciBiZSBhYmxlIHRvIG1vdmUgcGllY2VzIGFyb3VuZFxuICBkaXNhYmxlQ29udGV4dE1lbnU/OiBib29sZWFuOyAvLyBiZWNhdXNlIHdobyBuZWVkcyBhIGNvbnRleHQgbWVudSBvbiBhIGNoZXNzYm9hcmRcbiAgcmVzaXphYmxlPzogYm9vbGVhbjsgLy8gbGlzdGVucyB0byBjaGVzc2dyb3VuZC5yZXNpemUgb24gZG9jdW1lbnQuYm9keSB0byBjbGVhciBib3VuZHMgY2FjaGVcbiAgYWRkUGllY2VaSW5kZXg/OiBib29sZWFuOyAvLyBhZGRzIHotaW5kZXggdmFsdWVzIHRvIHBpZWNlcyAoZm9yIDNEKVxuICAvLyBwaWVjZUtleTogYm9vbGVhbjsgLy8gYWRkIGEgZGF0YS1rZXkgYXR0cmlidXRlIHRvIHBpZWNlIGVsZW1lbnRzXG4gIGhpZ2hsaWdodD86IHtcbiAgICBsYXN0TW92ZT86IGJvb2xlYW47IC8vIGFkZCBsYXN0LW1vdmUgY2xhc3MgdG8gc3F1YXJlc1xuICAgIGNoZWNrPzogYm9vbGVhbjsgLy8gYWRkIGNoZWNrIGNsYXNzIHRvIHNxdWFyZXNcbiAgfTtcbiAgYW5pbWF0aW9uPzoge1xuICAgIGVuYWJsZWQ/OiBib29sZWFuO1xuICAgIGR1cmF0aW9uPzogbnVtYmVyO1xuICB9O1xuICBtb3ZhYmxlPzoge1xuICAgIGZyZWU/OiBib29sZWFuOyAvLyBhbGwgbW92ZXMgYXJlIHZhbGlkIC0gYm9hcmQgZWRpdG9yXG4gICAgY29sb3I/OiBjZy5Db2xvciB8ICdib3RoJzsgLy8gY29sb3IgdGhhdCBjYW4gbW92ZS4gd2hpdGUgfCBibGFjayB8IGJvdGggfCB1bmRlZmluZWRcbiAgICBkZXN0cz86IHtcbiAgICAgIFtrZXk6IHN0cmluZ106IGNnLktleVtdXG4gICAgfTsgLy8gdmFsaWQgbW92ZXMuIHtcImEyXCIgW1wiYTNcIiBcImE0XCJdIFwiYjFcIiBbXCJhM1wiIFwiYzNcIl19XG4gICAgc2hvd0Rlc3RzPzogYm9vbGVhbjsgLy8gd2hldGhlciB0byBhZGQgdGhlIG1vdmUtZGVzdCBjbGFzcyBvbiBzcXVhcmVzXG4gICAgZXZlbnRzPzoge1xuICAgICAgYWZ0ZXI/OiAob3JpZzogY2cuS2V5LCBkZXN0OiBjZy5LZXksIG1ldGFkYXRhOiBjZy5Nb3ZlTWV0YWRhdGEpID0+IHZvaWQ7IC8vIGNhbGxlZCBhZnRlciB0aGUgbW92ZSBoYXMgYmVlbiBwbGF5ZWRcbiAgICAgIGFmdGVyTmV3UGllY2U/OiAocm9sZTogY2cuUm9sZSwga2V5OiBjZy5LZXksIG1ldGFkYXRhOiBjZy5Nb3ZlTWV0YWRhdGEpID0+IHZvaWQ7IC8vIGNhbGxlZCBhZnRlciBhIG5ldyBwaWVjZSBpcyBkcm9wcGVkIG9uIHRoZSBib2FyZFxuICAgIH07XG4gICAgcm9va0Nhc3RsZT86IGJvb2xlYW4gLy8gY2FzdGxlIGJ5IG1vdmluZyB0aGUga2luZyB0byB0aGUgcm9va1xuICB9O1xuICBwcmVtb3ZhYmxlPzoge1xuICAgIGVuYWJsZWQ/OiBib29sZWFuOyAvLyBhbGxvdyBwcmVtb3ZlcyBmb3IgY29sb3IgdGhhdCBjYW4gbm90IG1vdmVcbiAgICBzaG93RGVzdHM/OiBib29sZWFuOyAvLyB3aGV0aGVyIHRvIGFkZCB0aGUgcHJlbW92ZS1kZXN0IGNsYXNzIG9uIHNxdWFyZXNcbiAgICBjYXN0bGU/OiBib29sZWFuOyAvLyB3aGV0aGVyIHRvIGFsbG93IGtpbmcgY2FzdGxlIHByZW1vdmVzXG4gICAgZGVzdHM/OiBjZy5LZXlbXTsgLy8gcHJlbW92ZSBkZXN0aW5hdGlvbnMgZm9yIHRoZSBjdXJyZW50IHNlbGVjdGlvblxuICAgIGV2ZW50cz86IHtcbiAgICAgIHNldD86IChvcmlnOiBjZy5LZXksIGRlc3Q6IGNnLktleSwgbWV0YWRhdGE/OiBjZy5TZXRQcmVtb3ZlTWV0YWRhdGEpID0+IHZvaWQ7IC8vIGNhbGxlZCBhZnRlciB0aGUgcHJlbW92ZSBoYXMgYmVlbiBzZXRcbiAgICAgIHVuc2V0PzogKCkgPT4gdm9pZDsgIC8vIGNhbGxlZCBhZnRlciB0aGUgcHJlbW92ZSBoYXMgYmVlbiB1bnNldFxuICAgIH1cbiAgfTtcbiAgcHJlZHJvcHBhYmxlPzoge1xuICAgIGVuYWJsZWQ/OiBib29sZWFuOyAvLyBhbGxvdyBwcmVkcm9wcyBmb3IgY29sb3IgdGhhdCBjYW4gbm90IG1vdmVcbiAgICBldmVudHM/OiB7XG4gICAgICBzZXQ/OiAocm9sZTogY2cuUm9sZSwga2V5OiBjZy5LZXkpID0+IHZvaWQ7IC8vIGNhbGxlZCBhZnRlciB0aGUgcHJlZHJvcCBoYXMgYmVlbiBzZXRcbiAgICAgIHVuc2V0PzogKCkgPT4gdm9pZDsgLy8gY2FsbGVkIGFmdGVyIHRoZSBwcmVkcm9wIGhhcyBiZWVuIHVuc2V0XG4gICAgfVxuICB9O1xuICBkcmFnZ2FibGU/OiB7XG4gICAgZW5hYmxlZD86IGJvb2xlYW47IC8vIGFsbG93IG1vdmVzICYgcHJlbW92ZXMgdG8gdXNlIGRyYWcnbiBkcm9wXG4gICAgZGlzdGFuY2U/OiBudW1iZXI7IC8vIG1pbmltdW0gZGlzdGFuY2UgdG8gaW5pdGlhdGUgYSBkcmFnOyBpbiBwaXhlbHNcbiAgICBhdXRvRGlzdGFuY2U/OiBib29sZWFuOyAvLyBsZXRzIGNoZXNzZ3JvdW5kIHNldCBkaXN0YW5jZSB0byB6ZXJvIHdoZW4gdXNlciBkcmFncyBwaWVjZXNcbiAgICBjZW50ZXJQaWVjZT86IGJvb2xlYW47IC8vIGNlbnRlciB0aGUgcGllY2Ugb24gY3Vyc29yIGF0IGRyYWcgc3RhcnRcbiAgICBzaG93R2hvc3Q/OiBib29sZWFuOyAvLyBzaG93IGdob3N0IG9mIHBpZWNlIGJlaW5nIGRyYWdnZWRcbiAgICBkZWxldGVPbkRyb3BPZmY/OiBib29sZWFuOyAvLyBkZWxldGUgYSBwaWVjZSB3aGVuIGl0IGlzIGRyb3BwZWQgb2ZmIHRoZSBib2FyZFxuICB9O1xuICBzZWxlY3RhYmxlPzoge1xuICAgIC8vIGRpc2FibGUgdG8gZW5mb3JjZSBkcmFnZ2luZyBvdmVyIGNsaWNrLWNsaWNrIG1vdmVcbiAgICBlbmFibGVkPzogYm9vbGVhblxuICB9O1xuICBldmVudHM/OiB7XG4gICAgY2hhbmdlPzogKCkgPT4gdm9pZDsgLy8gY2FsbGVkIGFmdGVyIHRoZSBzaXR1YXRpb24gY2hhbmdlcyBvbiB0aGUgYm9hcmRcbiAgICAvLyBjYWxsZWQgYWZ0ZXIgYSBwaWVjZSBoYXMgYmVlbiBtb3ZlZC5cbiAgICAvLyBjYXB0dXJlZFBpZWNlIGlzIHVuZGVmaW5lZCBvciBsaWtlIHtjb2xvcjogJ3doaXRlJzsgJ3JvbGUnOiAncXVlZW4nfVxuICAgIG1vdmU/OiAob3JpZzogY2cuS2V5LCBkZXN0OiBjZy5LZXksIGNhcHR1cmVkUGllY2U/OiBjZy5QaWVjZSkgPT4gdm9pZDtcbiAgICBkcm9wTmV3UGllY2U/OiAocGllY2U6IGNnLlBpZWNlLCBrZXk6IGNnLktleSkgPT4gdm9pZDtcbiAgICBzZWxlY3Q/OiAoa2V5OiBjZy5LZXkpID0+IHZvaWQ7IC8vIGNhbGxlZCB3aGVuIGEgc3F1YXJlIGlzIHNlbGVjdGVkXG4gICAgaW5zZXJ0PzogKGVsZW1lbnRzOiBjZy5FbGVtZW50cykgPT4gdm9pZDsgLy8gd2hlbiB0aGUgYm9hcmQgRE9NIGhhcyBiZWVuIChyZSlpbnNlcnRlZFxuICB9O1xuICBkcmF3YWJsZT86IHtcbiAgICBlbmFibGVkPzogYm9vbGVhbjsgLy8gY2FuIGRyYXdcbiAgICB2aXNpYmxlPzogYm9vbGVhbjsgLy8gY2FuIHZpZXdcbiAgICBlcmFzZU9uQ2xpY2s/OiBib29sZWFuO1xuICAgIHNoYXBlcz86IERyYXdTaGFwZVtdO1xuICAgIGF1dG9TaGFwZXM/OiBEcmF3U2hhcGVbXTtcbiAgICBicnVzaGVzPzogRHJhd0JydXNoW107XG4gICAgcGllY2VzPzoge1xuICAgICAgYmFzZVVybD86IHN0cmluZztcbiAgICB9XG4gIH07XG4gIGdlb21ldHJ5PzogY2cuR2VvbWV0cnk7IC8vIGRpbTh4OCB8IGRpbTl4OSB8IGRpbTEweDggfCBkaW05eDEwXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb25maWd1cmUoc3RhdGU6IFN0YXRlLCBjb25maWc6IENvbmZpZykge1xuXG4gIC8vIGRvbid0IG1lcmdlIGRlc3RpbmF0aW9ucy4gSnVzdCBvdmVycmlkZS5cbiAgaWYgKGNvbmZpZy5tb3ZhYmxlICYmIGNvbmZpZy5tb3ZhYmxlLmRlc3RzKSBzdGF0ZS5tb3ZhYmxlLmRlc3RzID0gdW5kZWZpbmVkO1xuXG4gIG1lcmdlKHN0YXRlLCBjb25maWcpO1xuXG4gIGlmIChjb25maWcuZ2VvbWV0cnkpIHN0YXRlLmRpbWVuc2lvbnMgPSBjZy5kaW1lbnNpb25zW2NvbmZpZy5nZW9tZXRyeV07XG5cbiAgLy8gaWYgYSBmZW4gd2FzIHByb3ZpZGVkLCByZXBsYWNlIHRoZSBwaWVjZXNcbiAgaWYgKGNvbmZpZy5mZW4pIHtcbiAgICBzdGF0ZS5waWVjZXMgPSBmZW5SZWFkKGNvbmZpZy5mZW4sIHN0YXRlLmdlb21ldHJ5KTtcbiAgICBzdGF0ZS5kcmF3YWJsZS5zaGFwZXMgPSBbXTtcbiAgfVxuXG4gIC8vIGFwcGx5IGNvbmZpZyB2YWx1ZXMgdGhhdCBjb3VsZCBiZSB1bmRlZmluZWQgeWV0IG1lYW5pbmdmdWxcbiAgaWYgKGNvbmZpZy5oYXNPd25Qcm9wZXJ0eSgnY2hlY2snKSkgc2V0Q2hlY2soc3RhdGUsIGNvbmZpZy5jaGVjayB8fCBmYWxzZSk7XG4gIGlmIChjb25maWcuaGFzT3duUHJvcGVydHkoJ2xhc3RNb3ZlJykgJiYgIWNvbmZpZy5sYXN0TW92ZSkgc3RhdGUubGFzdE1vdmUgPSB1bmRlZmluZWQ7XG4gIC8vIGluIGNhc2Ugb2YgWkggZHJvcCBsYXN0IG1vdmUsIHRoZXJlJ3MgYSBzaW5nbGUgc3F1YXJlLlxuICAvLyBpZiB0aGUgcHJldmlvdXMgbGFzdCBtb3ZlIGhhZCB0d28gc3F1YXJlcyxcbiAgLy8gdGhlIG1lcmdlIGFsZ29yaXRobSB3aWxsIGluY29ycmVjdGx5IGtlZXAgdGhlIHNlY29uZCBzcXVhcmUuXG4gIGVsc2UgaWYgKGNvbmZpZy5sYXN0TW92ZSkgc3RhdGUubGFzdE1vdmUgPSBjb25maWcubGFzdE1vdmU7XG5cbiAgLy8gZml4IG1vdmUvcHJlbW92ZSBkZXN0c1xuICBpZiAoc3RhdGUuc2VsZWN0ZWQpIHNldFNlbGVjdGVkKHN0YXRlLCBzdGF0ZS5zZWxlY3RlZCk7XG5cbiAgLy8gbm8gbmVlZCBmb3Igc3VjaCBzaG9ydCBhbmltYXRpb25zXG4gIGlmICghc3RhdGUuYW5pbWF0aW9uLmR1cmF0aW9uIHx8IHN0YXRlLmFuaW1hdGlvbi5kdXJhdGlvbiA8IDEwMCkgc3RhdGUuYW5pbWF0aW9uLmVuYWJsZWQgPSBmYWxzZTtcblxuICBpZiAoIXN0YXRlLm1vdmFibGUucm9va0Nhc3RsZSAmJiBzdGF0ZS5tb3ZhYmxlLmRlc3RzKSB7XG4gICAgY29uc3QgcmFuayA9IHN0YXRlLm1vdmFibGUuY29sb3IgPT09ICd3aGl0ZScgPyAxIDogOCxcbiAgICBraW5nU3RhcnRQb3MgPSAnZScgKyByYW5rLFxuICAgIGRlc3RzID0gc3RhdGUubW92YWJsZS5kZXN0c1traW5nU3RhcnRQb3NdLFxuICAgIGtpbmcgPSBzdGF0ZS5waWVjZXNba2luZ1N0YXJ0UG9zXTtcbiAgICBpZiAoIWRlc3RzIHx8ICFraW5nIHx8IGtpbmcucm9sZSAhPT0gJ2tpbmcnKSByZXR1cm47XG4gICAgc3RhdGUubW92YWJsZS5kZXN0c1traW5nU3RhcnRQb3NdID0gZGVzdHMuZmlsdGVyKGQgPT5cbiAgICAgICEoKGQgPT09ICdhJyArIHJhbmspICYmIGRlc3RzLmluZGV4T2YoJ2MnICsgcmFuayBhcyBjZy5LZXkpICE9PSAtMSkgJiZcbiAgICAgICAgISgoZCA9PT0gJ2gnICsgcmFuaykgJiYgZGVzdHMuaW5kZXhPZignZycgKyByYW5rIGFzIGNnLktleSkgIT09IC0xKVxuICAgICk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIG1lcmdlKGJhc2U6IGFueSwgZXh0ZW5kOiBhbnkpIHtcbiAgZm9yIChsZXQga2V5IGluIGV4dGVuZCkge1xuICAgIGlmIChpc09iamVjdChiYXNlW2tleV0pICYmIGlzT2JqZWN0KGV4dGVuZFtrZXldKSkgbWVyZ2UoYmFzZVtrZXldLCBleHRlbmRba2V5XSk7XG4gICAgZWxzZSBiYXNlW2tleV0gPSBleHRlbmRba2V5XTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc09iamVjdChvOiBhbnkpOiBib29sZWFuIHtcbiAgcmV0dXJuIHR5cGVvZiBvID09PSAnb2JqZWN0Jztcbn1cbiIsImltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSdcbmltcG9ydCAqIGFzIGJvYXJkIGZyb20gJy4vYm9hcmQnXG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJy4vdXRpbCdcbmltcG9ydCB7IGNsZWFyIGFzIGRyYXdDbGVhciB9IGZyb20gJy4vZHJhdydcbmltcG9ydCAqIGFzIGNnIGZyb20gJy4vdHlwZXMnXG5pbXBvcnQgeyBhbmltIH0gZnJvbSAnLi9hbmltJ1xuXG5leHBvcnQgaW50ZXJmYWNlIERyYWdDdXJyZW50IHtcbiAgb3JpZzogY2cuS2V5OyAvLyBvcmlnIGtleSBvZiBkcmFnZ2luZyBwaWVjZVxuICBvcmlnUG9zOiBjZy5Qb3M7XG4gIHBpZWNlOiBjZy5QaWVjZTtcbiAgcmVsOiBjZy5OdW1iZXJQYWlyOyAvLyB4OyB5IG9mIHRoZSBwaWVjZSBhdCBvcmlnaW5hbCBwb3NpdGlvblxuICBlcG9zOiBjZy5OdW1iZXJQYWlyOyAvLyBpbml0aWFsIGV2ZW50IHBvc2l0aW9uXG4gIHBvczogY2cuTnVtYmVyUGFpcjsgLy8gcmVsYXRpdmUgY3VycmVudCBwb3NpdGlvblxuICBkZWM6IGNnLk51bWJlclBhaXI7IC8vIHBpZWNlIGNlbnRlciBkZWNheVxuICBzdGFydGVkOiBib29sZWFuOyAvLyB3aGV0aGVyIHRoZSBkcmFnIGhhcyBzdGFydGVkOyBhcyBwZXIgdGhlIGRpc3RhbmNlIHNldHRpbmdcbiAgZWxlbWVudDogY2cuUGllY2VOb2RlIHwgKCgpID0+IGNnLlBpZWNlTm9kZSB8IHVuZGVmaW5lZCk7XG4gIG5ld1BpZWNlPzogYm9vbGVhbjsgLy8gaXQgaXQgYSBuZXcgcGllY2UgZnJvbSBvdXRzaWRlIHRoZSBib2FyZFxuICBmb3JjZT86IGJvb2xlYW47IC8vIGNhbiB0aGUgbmV3IHBpZWNlIHJlcGxhY2UgYW4gZXhpc3Rpbmcgb25lIChlZGl0b3IpXG4gIHByZXZpb3VzbHlTZWxlY3RlZD86IGNnLktleTtcbiAgb3JpZ2luVGFyZ2V0OiBFdmVudFRhcmdldCB8IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdGFydChzOiBTdGF0ZSwgZTogY2cuTW91Y2hFdmVudCk6IHZvaWQge1xuICBpZiAoZS5idXR0b24gIT09IHVuZGVmaW5lZCAmJiBlLmJ1dHRvbiAhPT0gMCkgcmV0dXJuOyAvLyBvbmx5IHRvdWNoIG9yIGxlZnQgY2xpY2tcbiAgaWYgKGUudG91Y2hlcyAmJiBlLnRvdWNoZXMubGVuZ3RoID4gMSkgcmV0dXJuOyAvLyBzdXBwb3J0IG9uZSBmaW5nZXIgdG91Y2ggb25seVxuICBjb25zdCBib3VuZHMgPSBzLmRvbS5ib3VuZHMoKSxcbiAgcG9zaXRpb24gPSB1dGlsLmV2ZW50UG9zaXRpb24oZSkgYXMgY2cuTnVtYmVyUGFpcixcbiAgb3JpZyA9IGJvYXJkLmdldEtleUF0RG9tUG9zKHBvc2l0aW9uLCBib2FyZC53aGl0ZVBvdihzKSwgYm91bmRzLCBzLmdlb21ldHJ5KTtcbiAgaWYgKCFvcmlnKSByZXR1cm47XG4gIGNvbnN0IHBpZWNlID0gcy5waWVjZXNbb3JpZ107XG4gIGNvbnN0IHByZXZpb3VzbHlTZWxlY3RlZCA9IHMuc2VsZWN0ZWQ7XG4gIGlmICghcHJldmlvdXNseVNlbGVjdGVkICYmIHMuZHJhd2FibGUuZW5hYmxlZCAmJiAoXG4gICAgcy5kcmF3YWJsZS5lcmFzZU9uQ2xpY2sgfHwgKCFwaWVjZSB8fCBwaWVjZS5jb2xvciAhPT0gcy50dXJuQ29sb3IpXG4gICkpIGRyYXdDbGVhcihzKTtcbiAgLy8gUHJldmVudCB0b3VjaCBzY3JvbGwgYW5kIGNyZWF0ZSBubyBjb3JyZXNwb25kaW5nIG1vdXNlIGV2ZW50LCBpZiB0aGVyZVxuICAvLyBpcyBhbiBpbnRlbnQgdG8gaW50ZXJhY3Qgd2l0aCB0aGUgYm9hcmQuIElmIG5vIGNvbG9yIGlzIG1vdmFibGVcbiAgLy8gKGFuZCB0aGUgYm9hcmQgaXMgbm90IGZvciB2aWV3aW5nIG9ubHkpLCB0b3VjaGVzIGFyZSBsaWtlbHkgaW50ZW5kZWQgdG9cbiAgLy8gc2VsZWN0IHNxdWFyZXMuXG4gIGlmIChlLmNhbmNlbGFibGUgIT09IGZhbHNlICYmXG4gICAgICAoIWUudG91Y2hlcyB8fCAhcy5tb3ZhYmxlLmNvbG9yIHx8IHBpZWNlIHx8IHByZXZpb3VzbHlTZWxlY3RlZCB8fCBwaWVjZUNsb3NlVG8ocywgcG9zaXRpb24pKSlcbiAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gIGNvbnN0IGhhZFByZW1vdmUgPSAhIXMucHJlbW92YWJsZS5jdXJyZW50O1xuICBjb25zdCBoYWRQcmVkcm9wID0gISFzLnByZWRyb3BwYWJsZS5jdXJyZW50O1xuICBzLnN0YXRzLmN0cmxLZXkgPSBlLmN0cmxLZXk7XG4gIGlmIChzLnNlbGVjdGVkICYmIGJvYXJkLmNhbk1vdmUocywgcy5zZWxlY3RlZCwgb3JpZykpIHtcbiAgICBhbmltKHN0YXRlID0+IGJvYXJkLnNlbGVjdFNxdWFyZShzdGF0ZSwgb3JpZyksIHMpO1xuICB9IGVsc2Uge1xuICAgIGJvYXJkLnNlbGVjdFNxdWFyZShzLCBvcmlnKTtcbiAgfVxuICBjb25zdCBzdGlsbFNlbGVjdGVkID0gcy5zZWxlY3RlZCA9PT0gb3JpZztcbiAgY29uc3QgZWxlbWVudCA9IHBpZWNlRWxlbWVudEJ5S2V5KHMsIG9yaWcpO1xuICBjb25zdCBmaXJzdFJhbmtJczAgPSBzLmRpbWVuc2lvbnMuaGVpZ2h0ID09PSAxMDtcbiAgaWYgKHBpZWNlICYmIGVsZW1lbnQgJiYgc3RpbGxTZWxlY3RlZCAmJiBib2FyZC5pc0RyYWdnYWJsZShzLCBvcmlnKSkge1xuICAgIGNvbnN0IHNxdWFyZUJvdW5kcyA9IGNvbXB1dGVTcXVhcmVCb3VuZHMob3JpZywgYm9hcmQud2hpdGVQb3YocyksIGJvdW5kcywgcy5kaW1lbnNpb25zKTtcbiAgICBzLmRyYWdnYWJsZS5jdXJyZW50ID0ge1xuICAgICAgb3JpZyxcbiAgICAgIG9yaWdQb3M6IHV0aWwua2V5MnBvcyhvcmlnLCBmaXJzdFJhbmtJczApLFxuICAgICAgcGllY2UsXG4gICAgICByZWw6IHBvc2l0aW9uLFxuICAgICAgZXBvczogcG9zaXRpb24sXG4gICAgICBwb3M6IFswLCAwXSxcbiAgICAgIGRlYzogcy5kcmFnZ2FibGUuY2VudGVyUGllY2UgPyBbXG4gICAgICAgIHBvc2l0aW9uWzBdIC0gKHNxdWFyZUJvdW5kcy5sZWZ0ICsgc3F1YXJlQm91bmRzLndpZHRoIC8gMiksXG4gICAgICAgIHBvc2l0aW9uWzFdIC0gKHNxdWFyZUJvdW5kcy50b3AgKyBzcXVhcmVCb3VuZHMuaGVpZ2h0IC8gMilcbiAgICAgIF0gOiBbMCwgMF0sXG4gICAgICBzdGFydGVkOiBzLmRyYWdnYWJsZS5hdXRvRGlzdGFuY2UgJiYgcy5zdGF0cy5kcmFnZ2VkLFxuICAgICAgZWxlbWVudCxcbiAgICAgIHByZXZpb3VzbHlTZWxlY3RlZCxcbiAgICAgIG9yaWdpblRhcmdldDogZS50YXJnZXRcbiAgICB9O1xuICAgIGVsZW1lbnQuY2dEcmFnZ2luZyA9IHRydWU7XG4gICAgZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdkcmFnZ2luZycpO1xuICAgIC8vIHBsYWNlIGdob3N0XG4gICAgY29uc3QgZ2hvc3QgPSBzLmRvbS5lbGVtZW50cy5naG9zdDtcbiAgICBpZiAoZ2hvc3QpIHtcbiAgICAgIGdob3N0LmNsYXNzTmFtZSA9IGBnaG9zdCAke3BpZWNlLmNvbG9yfSAke3BpZWNlLnJvbGV9YDtcbiAgICAgIHV0aWwudHJhbnNsYXRlQWJzKGdob3N0LCB1dGlsLnBvc1RvVHJhbnNsYXRlQWJzKGJvdW5kcywgcy5kaW1lbnNpb25zKSh1dGlsLmtleTJwb3Mob3JpZywgZmlyc3RSYW5rSXMwKSwgYm9hcmQud2hpdGVQb3YocykpKTtcbiAgICAgIHV0aWwuc2V0VmlzaWJsZShnaG9zdCwgdHJ1ZSk7XG4gICAgfVxuICAgIHByb2Nlc3NEcmFnKHMpO1xuICB9IGVsc2Uge1xuICAgIGlmIChoYWRQcmVtb3ZlKSBib2FyZC51bnNldFByZW1vdmUocyk7XG4gICAgaWYgKGhhZFByZWRyb3ApIGJvYXJkLnVuc2V0UHJlZHJvcChzKTtcbiAgfVxuICBzLmRvbS5yZWRyYXcoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBpZWNlQ2xvc2VUbyhzOiBTdGF0ZSwgcG9zOiBjZy5Qb3MpOiBib29sZWFuIHtcbiAgY29uc3QgYXNXaGl0ZSA9IGJvYXJkLndoaXRlUG92KHMpLFxuICBib3VuZHMgPSBzLmRvbS5ib3VuZHMoKSxcbiAgcmFkaXVzU3EgPSBNYXRoLnBvdyhib3VuZHMud2lkdGggLyA4LCAyKTtcbiAgZm9yIChsZXQga2V5IGluIHMucGllY2VzKSB7XG4gICAgY29uc3Qgc3F1YXJlQm91bmRzID0gY29tcHV0ZVNxdWFyZUJvdW5kcyhrZXkgYXMgY2cuS2V5LCBhc1doaXRlLCBib3VuZHMsIHMuZGltZW5zaW9ucyksXG4gICAgY2VudGVyOiBjZy5Qb3MgPSBbXG4gICAgICBzcXVhcmVCb3VuZHMubGVmdCArIHNxdWFyZUJvdW5kcy53aWR0aCAvIDIsXG4gICAgICBzcXVhcmVCb3VuZHMudG9wICsgc3F1YXJlQm91bmRzLmhlaWdodCAvIDJcbiAgICBdO1xuICAgIGlmICh1dGlsLmRpc3RhbmNlU3EoY2VudGVyLCBwb3MpIDw9IHJhZGl1c1NxKSByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkcmFnTmV3UGllY2UoczogU3RhdGUsIHBpZWNlOiBjZy5QaWVjZSwgZTogY2cuTW91Y2hFdmVudCwgZm9yY2U/OiBib29sZWFuKTogdm9pZCB7XG5cbiAgY29uc3Qga2V5OiBjZy5LZXkgPSAnejAnO1xuXG4gIHMucGllY2VzW2tleV0gPSBwaWVjZTtcblxuICBzLmRvbS5yZWRyYXcoKTtcblxuICBjb25zdCBwb3NpdGlvbiA9IHV0aWwuZXZlbnRQb3NpdGlvbihlKSBhcyBjZy5OdW1iZXJQYWlyLFxuICBhc1doaXRlID0gYm9hcmQud2hpdGVQb3YocyksXG4gIGJvdW5kcyA9IHMuZG9tLmJvdW5kcygpLFxuICBzcXVhcmVCb3VuZHMgPSBjb21wdXRlU3F1YXJlQm91bmRzKGtleSwgYXNXaGl0ZSwgYm91bmRzLCBzLmRpbWVuc2lvbnMpO1xuXG4gIGNvbnN0IHJlbDogY2cuTnVtYmVyUGFpciA9IFtcbiAgICAoYXNXaGl0ZSA/IDAgOiBzLmRpbWVuc2lvbnMud2lkdGggLSAxKSAqIHNxdWFyZUJvdW5kcy53aWR0aCArIGJvdW5kcy5sZWZ0LFxuICAgIChhc1doaXRlID8gcy5kaW1lbnNpb25zLmhlaWdodCA6IC0xKSAqIHNxdWFyZUJvdW5kcy5oZWlnaHQgKyBib3VuZHMudG9wXG4gIF07XG5cbiAgY29uc3QgZmlyc3RSYW5rSXMwID0gcy5nZW9tZXRyeSA9PT0gY2cuR2VvbWV0cnkuZGltOXgxMDtcbiAgcy5kcmFnZ2FibGUuY3VycmVudCA9IHtcbiAgICBvcmlnOiBrZXksXG4gICAgb3JpZ1BvczogdXRpbC5rZXkycG9zKCdhMCcsIGZpcnN0UmFua0lzMCksXG4gICAgcGllY2UsXG4gICAgcmVsLFxuICAgIGVwb3M6IHBvc2l0aW9uLFxuICAgIHBvczogW3Bvc2l0aW9uWzBdIC0gcmVsWzBdLCBwb3NpdGlvblsxXSAtIHJlbFsxXV0sXG4gICAgZGVjOiBbLXNxdWFyZUJvdW5kcy53aWR0aCAvIDIsIC1zcXVhcmVCb3VuZHMuaGVpZ2h0IC8gMl0sXG4gICAgc3RhcnRlZDogdHJ1ZSxcbiAgICBlbGVtZW50OiAoKSA9PiBwaWVjZUVsZW1lbnRCeUtleShzLCBrZXkpLFxuICAgIG9yaWdpblRhcmdldDogZS50YXJnZXQsXG4gICAgbmV3UGllY2U6IHRydWUsXG4gICAgZm9yY2U6ICEhZm9yY2VcbiAgfTtcbiAgcHJvY2Vzc0RyYWcocyk7XG59XG5cbmZ1bmN0aW9uIHByb2Nlc3NEcmFnKHM6IFN0YXRlKTogdm9pZCB7XG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgY29uc3QgY3VyID0gcy5kcmFnZ2FibGUuY3VycmVudDtcbiAgICBpZiAoIWN1cikgcmV0dXJuO1xuICAgIC8vIGNhbmNlbCBhbmltYXRpb25zIHdoaWxlIGRyYWdnaW5nXG4gICAgaWYgKHMuYW5pbWF0aW9uLmN1cnJlbnQgJiYgcy5hbmltYXRpb24uY3VycmVudC5wbGFuLmFuaW1zW2N1ci5vcmlnXSkgcy5hbmltYXRpb24uY3VycmVudCA9IHVuZGVmaW5lZDtcbiAgICAvLyBpZiBtb3ZpbmcgcGllY2UgaXMgZ29uZSwgY2FuY2VsXG4gICAgY29uc3Qgb3JpZ1BpZWNlID0gcy5waWVjZXNbY3VyLm9yaWddO1xuICAgIGlmICghb3JpZ1BpZWNlIHx8ICF1dGlsLnNhbWVQaWVjZShvcmlnUGllY2UsIGN1ci5waWVjZSkpIGNhbmNlbChzKTtcbiAgICBlbHNlIHtcbiAgICAgIGlmICghY3VyLnN0YXJ0ZWQgJiYgdXRpbC5kaXN0YW5jZVNxKGN1ci5lcG9zLCBjdXIucmVsKSA+PSBNYXRoLnBvdyhzLmRyYWdnYWJsZS5kaXN0YW5jZSwgMikpIGN1ci5zdGFydGVkID0gdHJ1ZTtcbiAgICAgIGlmIChjdXIuc3RhcnRlZCkge1xuXG4gICAgICAgIC8vIHN1cHBvcnQgbGF6eSBlbGVtZW50c1xuICAgICAgICBpZiAodHlwZW9mIGN1ci5lbGVtZW50ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgY29uc3QgZm91bmQgPSBjdXIuZWxlbWVudCgpO1xuICAgICAgICAgIGlmICghZm91bmQpIHJldHVybjtcbiAgICAgICAgICBmb3VuZC5jZ0RyYWdnaW5nID0gdHJ1ZTtcbiAgICAgICAgICBmb3VuZC5jbGFzc0xpc3QuYWRkKCdkcmFnZ2luZycpO1xuICAgICAgICAgIGN1ci5lbGVtZW50ID0gZm91bmQ7XG4gICAgICAgIH1cblxuICAgICAgICBjdXIucG9zID0gW1xuICAgICAgICAgIGN1ci5lcG9zWzBdIC0gY3VyLnJlbFswXSxcbiAgICAgICAgICBjdXIuZXBvc1sxXSAtIGN1ci5yZWxbMV1cbiAgICAgICAgXTtcblxuICAgICAgICAvLyBtb3ZlIHBpZWNlXG4gICAgICAgIGNvbnN0IHRyYW5zbGF0aW9uID0gdXRpbC5wb3NUb1RyYW5zbGF0ZUFicyhzLmRvbS5ib3VuZHMoKSwgcy5kaW1lbnNpb25zKShjdXIub3JpZ1BvcywgYm9hcmQud2hpdGVQb3YocykpO1xuICAgICAgICB0cmFuc2xhdGlvblswXSArPSBjdXIucG9zWzBdICsgY3VyLmRlY1swXTtcbiAgICAgICAgdHJhbnNsYXRpb25bMV0gKz0gY3VyLnBvc1sxXSArIGN1ci5kZWNbMV07XG4gICAgICAgIHV0aWwudHJhbnNsYXRlQWJzKGN1ci5lbGVtZW50LCB0cmFuc2xhdGlvbik7XG4gICAgICB9XG4gICAgfVxuICAgIHByb2Nlc3NEcmFnKHMpO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1vdmUoczogU3RhdGUsIGU6IGNnLk1vdWNoRXZlbnQpOiB2b2lkIHtcbiAgLy8gc3VwcG9ydCBvbmUgZmluZ2VyIHRvdWNoIG9ubHlcbiAgaWYgKHMuZHJhZ2dhYmxlLmN1cnJlbnQgJiYgKCFlLnRvdWNoZXMgfHwgZS50b3VjaGVzLmxlbmd0aCA8IDIpKSB7XG4gICAgcy5kcmFnZ2FibGUuY3VycmVudC5lcG9zID0gdXRpbC5ldmVudFBvc2l0aW9uKGUpIGFzIGNnLk51bWJlclBhaXI7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGVuZChzOiBTdGF0ZSwgZTogY2cuTW91Y2hFdmVudCk6IHZvaWQge1xuICBjb25zdCBjdXIgPSBzLmRyYWdnYWJsZS5jdXJyZW50O1xuICBpZiAoIWN1cikgcmV0dXJuO1xuICAvLyBjcmVhdGUgbm8gY29ycmVzcG9uZGluZyBtb3VzZSBldmVudFxuICBpZiAoZS50eXBlID09PSAndG91Y2hlbmQnICYmIGUuY2FuY2VsYWJsZSAhPT0gZmFsc2UpIGUucHJldmVudERlZmF1bHQoKTtcbiAgLy8gY29tcGFyaW5nIHdpdGggdGhlIG9yaWdpbiB0YXJnZXQgaXMgYW4gZWFzeSB3YXkgdG8gdGVzdCB0aGF0IHRoZSBlbmQgZXZlbnRcbiAgLy8gaGFzIHRoZSBzYW1lIHRvdWNoIG9yaWdpblxuICBpZiAoZS50eXBlID09PSAndG91Y2hlbmQnICYmIGN1ciAmJiBjdXIub3JpZ2luVGFyZ2V0ICE9PSBlLnRhcmdldCAmJiAhY3VyLm5ld1BpZWNlKSB7XG4gICAgcy5kcmFnZ2FibGUuY3VycmVudCA9IHVuZGVmaW5lZDtcbiAgICByZXR1cm47XG4gIH1cbiAgYm9hcmQudW5zZXRQcmVtb3ZlKHMpO1xuICBib2FyZC51bnNldFByZWRyb3Aocyk7XG4gIC8vIHRvdWNoZW5kIGhhcyBubyBwb3NpdGlvbjsgc28gdXNlIHRoZSBsYXN0IHRvdWNobW92ZSBwb3NpdGlvbiBpbnN0ZWFkXG4gIGNvbnN0IGV2ZW50UG9zOiBjZy5OdW1iZXJQYWlyID0gdXRpbC5ldmVudFBvc2l0aW9uKGUpIHx8IGN1ci5lcG9zO1xuICBjb25zdCBkZXN0ID0gYm9hcmQuZ2V0S2V5QXREb21Qb3MoZXZlbnRQb3MsIGJvYXJkLndoaXRlUG92KHMpLCBzLmRvbS5ib3VuZHMoKSwgcy5nZW9tZXRyeSk7XG4gIGlmIChkZXN0ICYmIGN1ci5zdGFydGVkICYmIGN1ci5vcmlnICE9PSBkZXN0KSB7XG4gICAgaWYgKGN1ci5uZXdQaWVjZSkgYm9hcmQuZHJvcE5ld1BpZWNlKHMsIGN1ci5vcmlnLCBkZXN0LCBjdXIuZm9yY2UpO1xuICAgIGVsc2Uge1xuICAgICAgcy5zdGF0cy5jdHJsS2V5ID0gZS5jdHJsS2V5O1xuICAgICAgaWYgKGJvYXJkLnVzZXJNb3ZlKHMsIGN1ci5vcmlnLCBkZXN0KSkgcy5zdGF0cy5kcmFnZ2VkID0gdHJ1ZTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoY3VyLm5ld1BpZWNlKSB7XG4gICAgZGVsZXRlIHMucGllY2VzW2N1ci5vcmlnXTtcbiAgfSBlbHNlIGlmIChzLmRyYWdnYWJsZS5kZWxldGVPbkRyb3BPZmYgJiYgIWRlc3QpIHtcbiAgICBkZWxldGUgcy5waWVjZXNbY3VyLm9yaWddO1xuICAgIGJvYXJkLmNhbGxVc2VyRnVuY3Rpb24ocy5ldmVudHMuY2hhbmdlKTtcbiAgfVxuICBpZiAoY3VyICYmIGN1ci5vcmlnID09PSBjdXIucHJldmlvdXNseVNlbGVjdGVkICYmIChjdXIub3JpZyA9PT0gZGVzdCB8fCAhZGVzdCkpXG4gICAgYm9hcmQudW5zZWxlY3Qocyk7XG4gIGVsc2UgaWYgKCFzLnNlbGVjdGFibGUuZW5hYmxlZCkgYm9hcmQudW5zZWxlY3Qocyk7XG5cbiAgcmVtb3ZlRHJhZ0VsZW1lbnRzKHMpO1xuXG4gIHMuZHJhZ2dhYmxlLmN1cnJlbnQgPSB1bmRlZmluZWQ7XG4gIHMuZG9tLnJlZHJhdygpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2FuY2VsKHM6IFN0YXRlKTogdm9pZCB7XG4gIGNvbnN0IGN1ciA9IHMuZHJhZ2dhYmxlLmN1cnJlbnQ7XG4gIGlmIChjdXIpIHtcbiAgICBpZiAoY3VyLm5ld1BpZWNlKSBkZWxldGUgcy5waWVjZXNbY3VyLm9yaWddO1xuICAgIHMuZHJhZ2dhYmxlLmN1cnJlbnQgPSB1bmRlZmluZWQ7XG4gICAgYm9hcmQudW5zZWxlY3Qocyk7XG4gICAgcmVtb3ZlRHJhZ0VsZW1lbnRzKHMpO1xuICAgIHMuZG9tLnJlZHJhdygpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZURyYWdFbGVtZW50cyhzOiBTdGF0ZSkge1xuICBjb25zdCBlID0gcy5kb20uZWxlbWVudHM7XG4gIGlmIChlLmdob3N0KSB1dGlsLnNldFZpc2libGUoZS5naG9zdCwgZmFsc2UpO1xufVxuXG5mdW5jdGlvbiBjb21wdXRlU3F1YXJlQm91bmRzKGtleTogY2cuS2V5LCBhc1doaXRlOiBib29sZWFuLCBib3VuZHM6IENsaWVudFJlY3QsIGJkOiBjZy5Cb2FyZERpbWVuc2lvbnMpIHtcbiAgY29uc3QgZmlyc3RSYW5rSXMwID0gYmQuaGVpZ2h0ID09PSAxMDtcbiAgY29uc3QgcG9zID0gdXRpbC5rZXkycG9zKGtleSwgZmlyc3RSYW5rSXMwKTtcbiAgaWYgKCFhc1doaXRlKSB7XG4gICAgcG9zWzBdID0gYmQud2lkdGggKyAxIC0gcG9zWzBdO1xuICAgIHBvc1sxXSA9IGJkLmhlaWdodCArIDEgLSBwb3NbMV07XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBsZWZ0OiBib3VuZHMubGVmdCArIGJvdW5kcy53aWR0aCAqIChwb3NbMF0gLSAxKSAvIGJkLndpZHRoLFxuICAgIHRvcDogYm91bmRzLnRvcCArIGJvdW5kcy5oZWlnaHQgKiAoYmQuaGVpZ2h0IC0gcG9zWzFdKSAvIGJkLmhlaWdodCxcbiAgICB3aWR0aDogYm91bmRzLndpZHRoIC8gYmQud2lkdGgsXG4gICAgaGVpZ2h0OiBib3VuZHMuaGVpZ2h0IC8gYmQuaGVpZ2h0XG4gIH07XG59XG5cbmZ1bmN0aW9uIHBpZWNlRWxlbWVudEJ5S2V5KHM6IFN0YXRlLCBrZXk6IGNnLktleSk6IGNnLlBpZWNlTm9kZSB8IHVuZGVmaW5lZCB7XG4gIGxldCBlbCA9IHMuZG9tLmVsZW1lbnRzLmJvYXJkLmZpcnN0Q2hpbGQgYXMgY2cuUGllY2VOb2RlO1xuICB3aGlsZSAoZWwpIHtcbiAgICBpZiAoZWwuY2dLZXkgPT09IGtleSAmJiBlbC50YWdOYW1lID09PSAnUElFQ0UnKSByZXR1cm4gZWw7XG4gICAgZWwgPSBlbC5uZXh0U2libGluZyBhcyBjZy5QaWVjZU5vZGU7XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbiIsImltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSdcbmltcG9ydCB7IHVuc2VsZWN0LCBjYW5jZWxNb3ZlLCBnZXRLZXlBdERvbVBvcywgd2hpdGVQb3YgfSBmcm9tICcuL2JvYXJkJ1xuaW1wb3J0IHsgZXZlbnRQb3NpdGlvbiwgaXNSaWdodEJ1dHRvbiB9IGZyb20gJy4vdXRpbCdcbmltcG9ydCAqIGFzIGNnIGZyb20gJy4vdHlwZXMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgRHJhd1NoYXBlIHtcbiAgb3JpZzogY2cuS2V5O1xuICBkZXN0PzogY2cuS2V5O1xuICBicnVzaDogc3RyaW5nO1xuICBtb2RpZmllcnM/OiBEcmF3TW9kaWZpZXJzO1xuICBwaWVjZT86IERyYXdTaGFwZVBpZWNlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERyYXdTaGFwZVBpZWNlIHtcbiAgcm9sZTogY2cuUm9sZTtcbiAgY29sb3I6IGNnLkNvbG9yO1xuICBzY2FsZT86IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEcmF3QnJ1c2gge1xuICBrZXk6IHN0cmluZztcbiAgY29sb3I6IHN0cmluZztcbiAgb3BhY2l0eTogbnVtYmVyO1xuICBsaW5lV2lkdGg6IG51bWJlclxufVxuXG5leHBvcnQgaW50ZXJmYWNlIERyYXdCcnVzaGVzIHtcbiAgW25hbWU6IHN0cmluZ106IERyYXdCcnVzaDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEcmF3TW9kaWZpZXJzIHtcbiAgbGluZVdpZHRoPzogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERyYXdhYmxlIHtcbiAgZW5hYmxlZDogYm9vbGVhbjsgLy8gY2FuIGRyYXdcbiAgdmlzaWJsZTogYm9vbGVhbjsgLy8gY2FuIHZpZXdcbiAgZXJhc2VPbkNsaWNrOiBib29sZWFuO1xuICBvbkNoYW5nZT86IChzaGFwZXM6IERyYXdTaGFwZVtdKSA9PiB2b2lkO1xuICBzaGFwZXM6IERyYXdTaGFwZVtdOyAvLyB1c2VyIHNoYXBlc1xuICBhdXRvU2hhcGVzOiBEcmF3U2hhcGVbXTsgLy8gY29tcHV0ZXIgc2hhcGVzXG4gIGN1cnJlbnQ/OiBEcmF3Q3VycmVudDtcbiAgYnJ1c2hlczogRHJhd0JydXNoZXM7XG4gIC8vIGRyYXdhYmxlIFNWRyBwaWVjZXM7IHVzZWQgZm9yIGNyYXp5aG91c2UgZHJvcFxuICBwaWVjZXM6IHtcbiAgICBiYXNlVXJsOiBzdHJpbmdcbiAgfSxcbiAgcHJldlN2Z0hhc2g6IHN0cmluZ1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERyYXdDdXJyZW50IHtcbiAgb3JpZzogY2cuS2V5OyAvLyBvcmlnIGtleSBvZiBkcmF3aW5nXG4gIGRlc3Q/OiBjZy5LZXk7IC8vIHNoYXBlIGRlc3QsIG9yIHVuZGVmaW5lZCBmb3IgY2lyY2xlXG4gIG1vdXNlU3E/OiBjZy5LZXk7IC8vIHNxdWFyZSBiZWluZyBtb3VzZWQgb3ZlclxuICBwb3M6IGNnLk51bWJlclBhaXI7IC8vIHJlbGF0aXZlIGN1cnJlbnQgcG9zaXRpb25cbiAgYnJ1c2g6IHN0cmluZzsgLy8gYnJ1c2ggbmFtZSBmb3Igc2hhcGVcbn1cblxuY29uc3QgYnJ1c2hlcyA9IFsnZ3JlZW4nLCAncmVkJywgJ2JsdWUnLCAneWVsbG93J107XG5cbmV4cG9ydCBmdW5jdGlvbiBzdGFydChzdGF0ZTogU3RhdGUsIGU6IGNnLk1vdWNoRXZlbnQpOiB2b2lkIHtcbiAgaWYgKGUudG91Y2hlcyAmJiBlLnRvdWNoZXMubGVuZ3RoID4gMSkgcmV0dXJuOyAvLyBzdXBwb3J0IG9uZSBmaW5nZXIgdG91Y2ggb25seVxuICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICBlLnByZXZlbnREZWZhdWx0KCk7XG4gIGUuY3RybEtleSA/IHVuc2VsZWN0KHN0YXRlKSA6IGNhbmNlbE1vdmUoc3RhdGUpO1xuICBjb25zdCBwb3MgPSBldmVudFBvc2l0aW9uKGUpIGFzIGNnLk51bWJlclBhaXIsXG4gIG9yaWcgPSBnZXRLZXlBdERvbVBvcyhwb3MsIHdoaXRlUG92KHN0YXRlKSwgc3RhdGUuZG9tLmJvdW5kcygpLCBzdGF0ZS5nZW9tZXRyeSk7XG4gIGlmICghb3JpZykgcmV0dXJuO1xuICBzdGF0ZS5kcmF3YWJsZS5jdXJyZW50ID0ge1xuICAgIG9yaWcsXG4gICAgcG9zLFxuICAgIGJydXNoOiBldmVudEJydXNoKGUpXG4gIH07XG4gIHByb2Nlc3NEcmF3KHN0YXRlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByb2Nlc3NEcmF3KHN0YXRlOiBTdGF0ZSk6IHZvaWQge1xuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgIGNvbnN0IGN1ciA9IHN0YXRlLmRyYXdhYmxlLmN1cnJlbnQ7XG4gICAgaWYgKGN1cikge1xuICAgICAgY29uc3QgbW91c2VTcSA9IGdldEtleUF0RG9tUG9zKGN1ci5wb3MsIHdoaXRlUG92KHN0YXRlKSwgc3RhdGUuZG9tLmJvdW5kcygpLCBzdGF0ZS5nZW9tZXRyeSk7XG4gICAgICBpZiAobW91c2VTcSAhPT0gY3VyLm1vdXNlU3EpIHtcbiAgICAgICAgY3VyLm1vdXNlU3EgPSBtb3VzZVNxO1xuICAgICAgICBjdXIuZGVzdCA9IG1vdXNlU3EgIT09IGN1ci5vcmlnID8gbW91c2VTcSA6IHVuZGVmaW5lZDtcbiAgICAgICAgc3RhdGUuZG9tLnJlZHJhd05vdygpO1xuICAgICAgfVxuICAgICAgcHJvY2Vzc0RyYXcoc3RhdGUpO1xuICAgIH1cbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtb3ZlKHN0YXRlOiBTdGF0ZSwgZTogY2cuTW91Y2hFdmVudCk6IHZvaWQge1xuICBpZiAoc3RhdGUuZHJhd2FibGUuY3VycmVudCkgc3RhdGUuZHJhd2FibGUuY3VycmVudC5wb3MgPSBldmVudFBvc2l0aW9uKGUpIGFzIGNnLk51bWJlclBhaXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlbmQoc3RhdGU6IFN0YXRlKTogdm9pZCB7XG4gIGNvbnN0IGN1ciA9IHN0YXRlLmRyYXdhYmxlLmN1cnJlbnQ7XG4gIGlmIChjdXIpIHtcbiAgICBpZiAoY3VyLm1vdXNlU3EpIGFkZFNoYXBlKHN0YXRlLmRyYXdhYmxlLCBjdXIpO1xuICAgIGNhbmNlbChzdGF0ZSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbmNlbChzdGF0ZTogU3RhdGUpOiB2b2lkIHtcbiAgaWYgKHN0YXRlLmRyYXdhYmxlLmN1cnJlbnQpIHtcbiAgICBzdGF0ZS5kcmF3YWJsZS5jdXJyZW50ID0gdW5kZWZpbmVkO1xuICAgIHN0YXRlLmRvbS5yZWRyYXcoKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY2xlYXIoc3RhdGU6IFN0YXRlKTogdm9pZCB7XG4gIGlmIChzdGF0ZS5kcmF3YWJsZS5zaGFwZXMubGVuZ3RoKSB7XG4gICAgc3RhdGUuZHJhd2FibGUuc2hhcGVzID0gW107XG4gICAgc3RhdGUuZG9tLnJlZHJhdygpO1xuICAgIG9uQ2hhbmdlKHN0YXRlLmRyYXdhYmxlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBldmVudEJydXNoKGU6IGNnLk1vdWNoRXZlbnQpOiBzdHJpbmcge1xuICByZXR1cm4gYnJ1c2hlc1soZS5zaGlmdEtleSAmJiBpc1JpZ2h0QnV0dG9uKGUpID8gMSA6IDApICsgKGUuYWx0S2V5ID8gMiA6IDApXTtcbn1cblxuZnVuY3Rpb24gYWRkU2hhcGUoZHJhd2FibGU6IERyYXdhYmxlLCBjdXI6IERyYXdDdXJyZW50KTogdm9pZCB7XG4gIGNvbnN0IHNhbWVTaGFwZSA9IChzOiBEcmF3U2hhcGUpID0+IHMub3JpZyA9PT0gY3VyLm9yaWcgJiYgcy5kZXN0ID09PSBjdXIuZGVzdDtcbiAgY29uc3Qgc2ltaWxhciA9IGRyYXdhYmxlLnNoYXBlcy5maWx0ZXIoc2FtZVNoYXBlKVswXTtcbiAgaWYgKHNpbWlsYXIpIGRyYXdhYmxlLnNoYXBlcyA9IGRyYXdhYmxlLnNoYXBlcy5maWx0ZXIocyA9PiAhc2FtZVNoYXBlKHMpKTtcbiAgaWYgKCFzaW1pbGFyIHx8IHNpbWlsYXIuYnJ1c2ggIT09IGN1ci5icnVzaCkgZHJhd2FibGUuc2hhcGVzLnB1c2goY3VyKTtcbiAgb25DaGFuZ2UoZHJhd2FibGUpO1xufVxuXG5mdW5jdGlvbiBvbkNoYW5nZShkcmF3YWJsZTogRHJhd2FibGUpOiB2b2lkIHtcbiAgaWYgKGRyYXdhYmxlLm9uQ2hhbmdlKSBkcmF3YWJsZS5vbkNoYW5nZShkcmF3YWJsZS5zaGFwZXMpO1xufVxuIiwiaW1wb3J0IHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJ1xuaW1wb3J0ICogYXMgY2cgZnJvbSAnLi90eXBlcydcbmltcG9ydCAqIGFzIGJvYXJkIGZyb20gJy4vYm9hcmQnXG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJy4vdXRpbCdcbmltcG9ydCB7IGNhbmNlbCBhcyBjYW5jZWxEcmFnIH0gZnJvbSAnLi9kcmFnJ1xuXG5leHBvcnQgZnVuY3Rpb24gc2V0RHJvcE1vZGUoczogU3RhdGUsIHBpZWNlPzogY2cuUGllY2UpOiB2b2lkIHtcbiAgcy5kcm9wbW9kZSA9IHtcbiAgICBhY3RpdmU6IHRydWUsXG4gICAgcGllY2VcbiAgfTtcbiAgY2FuY2VsRHJhZyhzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbmNlbERyb3BNb2RlKHM6IFN0YXRlKTogdm9pZCB7XG4gIHMuZHJvcG1vZGUgPSB7XG4gICAgYWN0aXZlOiBmYWxzZVxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZHJvcChzOiBTdGF0ZSwgZTogY2cuTW91Y2hFdmVudCk6IHZvaWQge1xuICBpZiAoIXMuZHJvcG1vZGUuYWN0aXZlKSByZXR1cm47XG5cbiAgYm9hcmQudW5zZXRQcmVtb3ZlKHMpO1xuICBib2FyZC51bnNldFByZWRyb3Aocyk7XG5cbiAgY29uc3QgcGllY2UgPSBzLmRyb3Btb2RlLnBpZWNlO1xuXG4gIGlmIChwaWVjZSkge1xuICAgIHMucGllY2VzLnowID0gcGllY2U7XG4gICAgY29uc3QgcG9zaXRpb24gPSB1dGlsLmV2ZW50UG9zaXRpb24oZSk7XG4gICAgY29uc3QgZGVzdCA9IHBvc2l0aW9uICYmIGJvYXJkLmdldEtleUF0RG9tUG9zKFxuICAgICAgcG9zaXRpb24sIGJvYXJkLndoaXRlUG92KHMpLCBzLmRvbS5ib3VuZHMoKSwgcy5nZW9tZXRyeSk7XG4gICAgaWYgKGRlc3QpIGJvYXJkLmRyb3BOZXdQaWVjZShzLCAnejAnLCBkZXN0KTtcbiAgfVxuICBzLmRvbS5yZWRyYXcoKTtcbn1cbiIsImltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSdcbmltcG9ydCAqIGFzIGRyYWcgZnJvbSAnLi9kcmFnJ1xuaW1wb3J0ICogYXMgZHJhdyBmcm9tICcuL2RyYXcnXG5pbXBvcnQgeyBkcm9wIH0gZnJvbSAnLi9kcm9wJ1xuaW1wb3J0IHsgaXNSaWdodEJ1dHRvbiB9IGZyb20gJy4vdXRpbCdcbmltcG9ydCAqIGFzIGNnIGZyb20gJy4vdHlwZXMnXG5cbnR5cGUgTW91Y2hCaW5kID0gKGU6IGNnLk1vdWNoRXZlbnQpID0+IHZvaWQ7XG50eXBlIFN0YXRlTW91Y2hCaW5kID0gKGQ6IFN0YXRlLCBlOiBjZy5Nb3VjaEV2ZW50KSA9PiB2b2lkO1xuXG5leHBvcnQgZnVuY3Rpb24gYmluZEJvYXJkKHM6IFN0YXRlKTogdm9pZCB7XG5cbiAgaWYgKHMudmlld09ubHkpIHJldHVybjtcblxuICBjb25zdCBib2FyZEVsID0gcy5kb20uZWxlbWVudHMuYm9hcmQsXG4gIG9uU3RhcnQgPSBzdGFydERyYWdPckRyYXcocyk7XG5cbiAgLy8gQ2Fubm90IGJlIHBhc3NpdmUsIGJlY2F1c2Ugd2UgcHJldmVudCB0b3VjaCBzY3JvbGxpbmcgYW5kIGRyYWdnaW5nIG9mXG4gIC8vIHNlbGVjdGVkIGVsZW1lbnRzLlxuICBib2FyZEVsLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCBvblN0YXJ0IGFzIEV2ZW50TGlzdGVuZXIsIHsgcGFzc2l2ZTogZmFsc2UgfSk7XG4gIGJvYXJkRWwuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgb25TdGFydCBhcyBFdmVudExpc3RlbmVyLCB7IHBhc3NpdmU6IGZhbHNlIH0pO1xuXG4gIGlmIChzLmRpc2FibGVDb250ZXh0TWVudSB8fCBzLmRyYXdhYmxlLmVuYWJsZWQpIHtcbiAgICBib2FyZEVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NvbnRleHRtZW51JywgZSA9PiBlLnByZXZlbnREZWZhdWx0KCkpO1xuICB9XG59XG5cbi8vIHJldHVybnMgdGhlIHVuYmluZCBmdW5jdGlvblxuZXhwb3J0IGZ1bmN0aW9uIGJpbmREb2N1bWVudChzOiBTdGF0ZSwgcmVkcmF3QWxsOiBjZy5SZWRyYXcpOiBjZy5VbmJpbmQge1xuXG4gIGNvbnN0IHVuYmluZHM6IGNnLlVuYmluZFtdID0gW107XG5cbiAgaWYgKCFzLmRvbS5yZWxhdGl2ZSAmJiBzLnJlc2l6YWJsZSkge1xuICAgIGNvbnN0IG9uUmVzaXplID0gKCkgPT4ge1xuICAgICAgcy5kb20uYm91bmRzLmNsZWFyKCk7XG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUocmVkcmF3QWxsKTtcbiAgICB9O1xuICAgIHVuYmluZHMucHVzaCh1bmJpbmRhYmxlKGRvY3VtZW50LmJvZHksICdjaGVzc2dyb3VuZC5yZXNpemUnLCBvblJlc2l6ZSkpO1xuICB9XG5cbiAgaWYgKCFzLnZpZXdPbmx5KSB7XG5cbiAgICBjb25zdCBvbm1vdmU6IE1vdWNoQmluZCA9IGRyYWdPckRyYXcocywgZHJhZy5tb3ZlLCBkcmF3Lm1vdmUpO1xuICAgIGNvbnN0IG9uZW5kOiBNb3VjaEJpbmQgPSBkcmFnT3JEcmF3KHMsIGRyYWcuZW5kLCBkcmF3LmVuZCk7XG5cbiAgICBbJ3RvdWNobW92ZScsICdtb3VzZW1vdmUnXS5mb3JFYWNoKGV2ID0+IHVuYmluZHMucHVzaCh1bmJpbmRhYmxlKGRvY3VtZW50LCBldiwgb25tb3ZlKSkpO1xuICAgIFsndG91Y2hlbmQnLCAnbW91c2V1cCddLmZvckVhY2goZXYgPT4gdW5iaW5kcy5wdXNoKHVuYmluZGFibGUoZG9jdW1lbnQsIGV2LCBvbmVuZCkpKTtcblxuICAgIGNvbnN0IG9uU2Nyb2xsID0gKCkgPT4gcy5kb20uYm91bmRzLmNsZWFyKCk7XG4gICAgdW5iaW5kcy5wdXNoKHVuYmluZGFibGUod2luZG93LCAnc2Nyb2xsJywgb25TY3JvbGwsIHsgcGFzc2l2ZTogdHJ1ZSB9KSk7XG4gICAgdW5iaW5kcy5wdXNoKHVuYmluZGFibGUod2luZG93LCAncmVzaXplJywgb25TY3JvbGwsIHsgcGFzc2l2ZTogdHJ1ZSB9KSk7XG4gIH1cblxuICByZXR1cm4gKCkgPT4gdW5iaW5kcy5mb3JFYWNoKGYgPT4gZigpKTtcbn1cblxuZnVuY3Rpb24gdW5iaW5kYWJsZShlbDogRXZlbnRUYXJnZXQsIGV2ZW50TmFtZTogc3RyaW5nLCBjYWxsYmFjazogTW91Y2hCaW5kLCBvcHRpb25zPzogYW55KTogY2cuVW5iaW5kIHtcbiAgZWwuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGNhbGxiYWNrIGFzIEV2ZW50TGlzdGVuZXIsIG9wdGlvbnMpO1xuICByZXR1cm4gKCkgPT4gZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGNhbGxiYWNrIGFzIEV2ZW50TGlzdGVuZXIpO1xufVxuXG5mdW5jdGlvbiBzdGFydERyYWdPckRyYXcoczogU3RhdGUpOiBNb3VjaEJpbmQge1xuICByZXR1cm4gZSA9PiB7XG4gICAgaWYgKHMuZHJhZ2dhYmxlLmN1cnJlbnQpIGRyYWcuY2FuY2VsKHMpO1xuICAgIGVsc2UgaWYgKHMuZHJhd2FibGUuY3VycmVudCkgZHJhdy5jYW5jZWwocyk7XG4gICAgZWxzZSBpZiAoZS5zaGlmdEtleSB8fCBpc1JpZ2h0QnV0dG9uKGUpKSB7IGlmIChzLmRyYXdhYmxlLmVuYWJsZWQpIGRyYXcuc3RhcnQocywgZSk7IH1cbiAgICBlbHNlIGlmICghcy52aWV3T25seSkge1xuICAgICAgaWYgKHMuZHJvcG1vZGUuYWN0aXZlKSBkcm9wKHMsIGUpO1xuICAgICAgZWxzZSBkcmFnLnN0YXJ0KHMsIGUpO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gZHJhZ09yRHJhdyhzOiBTdGF0ZSwgd2l0aERyYWc6IFN0YXRlTW91Y2hCaW5kLCB3aXRoRHJhdzogU3RhdGVNb3VjaEJpbmQpOiBNb3VjaEJpbmQge1xuICByZXR1cm4gZSA9PiB7XG4gICAgaWYgKGUuc2hpZnRLZXkgfHwgaXNSaWdodEJ1dHRvbihlKSkgeyBpZiAocy5kcmF3YWJsZS5lbmFibGVkKSB3aXRoRHJhdyhzLCBlKTsgfVxuICAgIGVsc2UgaWYgKCFzLnZpZXdPbmx5KSB3aXRoRHJhZyhzLCBlKTtcbiAgfTtcbn1cbiIsImltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSdcbmltcG9ydCB7IEtleSB9IGZyb20gJy4vdHlwZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGV4cGxvc2lvbihzdGF0ZTogU3RhdGUsIGtleXM6IEtleVtdKTogdm9pZCB7XG4gIHN0YXRlLmV4cGxvZGluZyA9IHsgc3RhZ2U6IDEsIGtleXMgfTtcbiAgc3RhdGUuZG9tLnJlZHJhdygpO1xuICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICBzZXRTdGFnZShzdGF0ZSwgMik7XG4gICAgc2V0VGltZW91dCgoKSA9PiBzZXRTdGFnZShzdGF0ZSwgdW5kZWZpbmVkKSwgMTIwKTtcbiAgfSwgMTIwKTtcbn1cblxuZnVuY3Rpb24gc2V0U3RhZ2Uoc3RhdGU6IFN0YXRlLCBzdGFnZTogbnVtYmVyIHwgdW5kZWZpbmVkKTogdm9pZCB7XG4gIGlmIChzdGF0ZS5leHBsb2RpbmcpIHtcbiAgICBpZiAoc3RhZ2UpIHN0YXRlLmV4cGxvZGluZy5zdGFnZSA9IHN0YWdlO1xuICAgIGVsc2Ugc3RhdGUuZXhwbG9kaW5nID0gdW5kZWZpbmVkO1xuICAgIHN0YXRlLmRvbS5yZWRyYXcoKTtcbiAgfVxufVxuIiwiaW1wb3J0IHsgcG9zMmtleSwgTlJhbmtzLCBpbnZOUmFua3MgfSBmcm9tICcuL3V0aWwnXG5pbXBvcnQgKiBhcyBjZyBmcm9tICcuL3R5cGVzJ1xuXG5leHBvcnQgY29uc3QgaW5pdGlhbDogY2cuRkVOID0gJ3JuYnFrYm5yL3BwcHBwcHBwLzgvOC84LzgvUFBQUFBQUFAvUk5CUUtCTlInO1xuXG5jb25zdCByb2xlczg6IHsgW2xldHRlcjogc3RyaW5nXTogY2cuUm9sZSB9ID0ge1xuICAgIHA6ICdwYXduJywgcjogJ3Jvb2snLCBuOiAna25pZ2h0JywgYjogJ2Jpc2hvcCcsIHE6ICdxdWVlbicsIGs6ICdraW5nJywgbTogJ21ldCcsIGY6ICdmZXJ6JywgczogJ3NpbHZlcicsIGM6ICdjYW5jZWxsb3InLCBhOiAnYXJjaGJpc2hvcCcsIGg6ICdoYXdrJywgZTogJ2VsZXBoYW50JyB9O1xuLy8gc2hvZ2lcbmNvbnN0IHJvbGVzOTogeyBbbGV0dGVyOiBzdHJpbmddOiBjZy5Sb2xlIH0gPSB7XG4gICAgcDogJ3Bhd24nLCByOiAncm9vaycsIG46ICdrbmlnaHQnLCBiOiAnYmlzaG9wJywgazogJ2tpbmcnLCBnOiAnZ29sZCcsIHM6ICdzaWx2ZXInLCBsOiAnbGFuY2UnIH07XG4vLyB4aWFuZ3FpXG5jb25zdCByb2xlczEwOiB7IFtsZXR0ZXI6IHN0cmluZ106IGNnLlJvbGUgfSA9IHtcbiAgICBwOiAncGF3bicsIHI6ICdyb29rJywgbjogJ2tuaWdodCcsIGI6ICdiaXNob3AnLCBrOiAna2luZycsIGM6ICdjYW5ub24nLCBhOiAnYWR2aXNvcicgfTtcblxuXG5jb25zdCBsZXR0ZXJzOCA9IHtcbiAgICBwYXduOiAncCcsIHJvb2s6ICdyJywga25pZ2h0OiAnbicsIGJpc2hvcDogJ2InLCBxdWVlbjogJ3EnLCBraW5nOiAnaycsIG1ldDogJ20nLCBmZXJ6OiAnZicsIHNpbHZlcjogJ3MnLCBjYW5jZWxsb3I6ICdjJywgYXJjaGJpc2hvcDogJ2EnLCBoYXdrOiAnaCcsIGVsZXBoYW50OiAnZScgfTtcbi8vIHNob2dpXG5jb25zdCBsZXR0ZXJzOSA9IHtcbiAgICBwYXduOiAncCcsIHJvb2s6ICdyJywga25pZ2h0OiAnbicsIGJpc2hvcDogJ2InLCBraW5nOiAnaycsIGdvbGQ6ICdnJywgc2lsdmVyOiAncycsIGxhbmNlOiAnbCcsXG4gICAgcHBhd246ICcrcCcsIHBrbmlnaHQ6ICcrbicsIHBiaXNob3A6ICcrYicsIHByb29rOiAnK3InLCBwc2lsdmVyOiAnK3MnLCBwbGFuY2U6ICcrbCcgfTtcbi8vIHhpYW5ncWlcbmNvbnN0IGxldHRlcnMxMCA9IHtcbiAgICBwYXduOiAncCcsIHJvb2s6ICdyJywga25pZ2h0OiAnbicsIGJpc2hvcDogJ2InLCBraW5nOiAnaycsIGNhbm5vbjogJ2MnLCBhZHZpc29yOiAnYSd9O1xuXG5leHBvcnQgZnVuY3Rpb24gcmVhZChmZW46IGNnLkZFTiwgZ2VvbTogY2cuR2VvbWV0cnkpOiBjZy5QaWVjZXMge1xuICBpZiAoZmVuID09PSAnc3RhcnQnKSBmZW4gPSBpbml0aWFsO1xuICBpZiAoZmVuLmluZGV4T2YoJ1snKSAhPT0gLTEpIGZlbiA9IGZlbi5zbGljZSgwLCBmZW4uaW5kZXhPZignWycpKTtcbiAgY29uc3QgcGllY2VzOiBjZy5QaWVjZXMgPSB7fTtcbiAgbGV0IHJvdzogbnVtYmVyID0gZmVuLnNwbGl0KFwiL1wiKS5sZW5ndGg7XG4gIGxldCBjb2w6IG51bWJlciA9IDA7XG4gIGxldCBwcm9tb3RlZDogYm9vbGVhbiA9IGZhbHNlO1xuICBjb25zdCByb2xlcyA9IChnZW9tID09PSBjZy5HZW9tZXRyeS5kaW05eDEwKSA/IHJvbGVzMTAgOiAoZ2VvbSA9PT0gY2cuR2VvbWV0cnkuZGltOXg5KSA/IHJvbGVzOSA6IHJvbGVzODtcbiAgY29uc3QgZmlyc3RSYW5rSXMwID0gcm93ID09PSAxMDtcbiAgY29uc3Qgc2hvZ2kgPSByb3cgPT09IDk7XG4gIGZvciAoY29uc3QgYyBvZiBmZW4pIHtcbiAgICBzd2l0Y2ggKGMpIHtcbiAgICAgIGNhc2UgJyAnOiByZXR1cm4gcGllY2VzO1xuICAgICAgY2FzZSAnLyc6XG4gICAgICAgIC0tcm93O1xuICAgICAgICBpZiAocm93ID09PSAwKSByZXR1cm4gcGllY2VzO1xuICAgICAgICBjb2wgPSAwO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJysnOlxuICAgICAgICBwcm9tb3RlZCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnfic6XG4gICAgICAgIGNvbnN0IHBpZWNlID0gcGllY2VzW2NnLmZpbGVzW2NvbF0gKyBjZy5yYW5rc1tmaXJzdFJhbmtJczAgPyByb3cgOiByb3cgKyAxXV07XG4gICAgICAgIGlmIChwaWVjZSkgcGllY2UucHJvbW90ZWQgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGNvbnN0IG5iID0gYy5jaGFyQ29kZUF0KDApO1xuICAgICAgICBpZiAobmIgPCA1OCkgY29sICs9IChjID09PSAnMCcpID8gOSA6IG5iIC0gNDg7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICsrY29sO1xuICAgICAgICAgIGNvbnN0IHJvbGUgPSBjLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgbGV0IHBpZWNlID0ge1xuICAgICAgICAgICAgcm9sZTogcm9sZXNbcm9sZV0sXG4gICAgICAgICAgICBjb2xvcjogKGMgPT09IHJvbGUgPyBzaG9naSA/ICd3aGl0ZSc6ICdibGFjaycgOiBzaG9naSA/ICdibGFjaycgOiAnd2hpdGUnKSBhcyBjZy5Db2xvclxuICAgICAgICAgIH0gYXMgY2cuUGllY2U7XG4gICAgICAgICAgaWYgKHByb21vdGVkKSB7XG4gICAgICAgICAgICBwaWVjZS5yb2xlID0gJ3AnICsgcGllY2Uucm9sZSBhcyBjZy5Sb2xlO1xuICAgICAgICAgICAgcGllY2UucHJvbW90ZWQgPSB0cnVlO1xuICAgICAgICAgICAgcHJvbW90ZWQgPSBmYWxzZTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIGlmIChzaG9naSkge1xuICAgICAgICAgICAgICBwaWVjZXNbY2cuZmlsZXNbMTAgLSBjb2wgLSAxXSArIGNnLnJhbmtzWzEwIC0gcm93XV0gPSBwaWVjZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBwaWVjZXNbY2cuZmlsZXNbY29sIC0gMV0gKyBjZy5yYW5rc1tmaXJzdFJhbmtJczAgPyByb3cgLSAxIDogcm93XV0gPSBwaWVjZTtcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBwaWVjZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZShwaWVjZXM6IGNnLlBpZWNlcywgZ2VvbTogY2cuR2VvbWV0cnkpOiBjZy5GRU4ge1xuICB2YXIgbGV0dGVyczogYW55ID0ge307XG4gIHN3aXRjaCAoZ2VvbSkge1xuICBjYXNlIGNnLkdlb21ldHJ5LmRpbTl4MTA6XG4gICAgbGV0dGVycyA9IGxldHRlcnMxMDtcbiAgICBicmVhaztcbiAgY2FzZSBjZy5HZW9tZXRyeS5kaW05eDk6XG4gICAgbGV0dGVycyA9IGxldHRlcnM5O1xuICAgIGJyZWFrO1xuICBkZWZhdWx0OlxuICAgIGxldHRlcnMgPSBsZXR0ZXJzODtcbiAgICBicmVha1xuICB9O1xuICByZXR1cm4gaW52TlJhbmtzLm1hcCh5ID0+IE5SYW5rcy5tYXAoeCA9PiB7XG4gICAgICBjb25zdCBwaWVjZSA9IHBpZWNlc1twb3Mya2V5KFt4LCB5XSwgZ2VvbSldO1xuICAgICAgaWYgKHBpZWNlKSB7XG4gICAgICAgIGNvbnN0IGxldHRlcjogc3RyaW5nID0gbGV0dGVyc1twaWVjZS5yb2xlXTtcbiAgICAgICAgcmV0dXJuIHBpZWNlLmNvbG9yID09PSAnd2hpdGUnID8gbGV0dGVyLnRvVXBwZXJDYXNlKCkgOiBsZXR0ZXI7XG4gICAgICB9IGVsc2UgcmV0dXJuICcxJztcbiAgICB9KS5qb2luKCcnKVxuICApLmpvaW4oJy8nKS5yZXBsYWNlKC8xezIsfS9nLCBzID0+IHMubGVuZ3RoLnRvU3RyaW5nKCkpO1xufVxuIiwiaW1wb3J0ICogYXMgdXRpbCBmcm9tICcuL3V0aWwnXG5pbXBvcnQgKiBhcyBjZyBmcm9tICcuL3R5cGVzJ1xuXG50eXBlIE1vYmlsaXR5ID0gKHgxOm51bWJlciwgeTE6bnVtYmVyLCB4MjpudW1iZXIsIHkyOm51bWJlcikgPT4gYm9vbGVhbjtcblxuZnVuY3Rpb24gZGlmZihhOiBudW1iZXIsIGI6bnVtYmVyKTpudW1iZXIge1xuICByZXR1cm4gTWF0aC5hYnMoYSAtIGIpO1xufVxuXG5mdW5jdGlvbiBwYXduKGNvbG9yOiBjZy5Db2xvcik6IE1vYmlsaXR5IHtcbiAgcmV0dXJuICh4MSwgeTEsIHgyLCB5MikgPT4gZGlmZih4MSwgeDIpIDwgMiAmJiAoXG4gICAgY29sb3IgPT09ICd3aGl0ZScgPyAoXG4gICAgICAvLyBhbGxvdyAyIHNxdWFyZXMgZnJvbSAxIGFuZCA4LCBmb3IgaG9yZGVcbiAgICAgIHkyID09PSB5MSArIDEgfHwgKHkxIDw9IDIgJiYgeTIgPT09ICh5MSArIDIpICYmIHgxID09PSB4MilcbiAgICApIDogKFxuICAgICAgeTIgPT09IHkxIC0gMSB8fCAoeTEgPj0gNyAmJiB5MiA9PT0gKHkxIC0gMikgJiYgeDEgPT09IHgyKVxuICAgIClcbiAgKTtcbn1cblxuY29uc3Qga25pZ2h0OiBNb2JpbGl0eSA9ICh4MSwgeTEsIHgyLCB5MikgPT4ge1xuICBjb25zdCB4ZCA9IGRpZmYoeDEsIHgyKTtcbiAgY29uc3QgeWQgPSBkaWZmKHkxLCB5Mik7XG4gIHJldHVybiAoeGQgPT09IDEgJiYgeWQgPT09IDIpIHx8ICh4ZCA9PT0gMiAmJiB5ZCA9PT0gMSk7XG59XG5cbmNvbnN0IGJpc2hvcDogTW9iaWxpdHkgPSAoeDEsIHkxLCB4MiwgeTIpID0+IHtcbiAgcmV0dXJuIGRpZmYoeDEsIHgyKSA9PT0gZGlmZih5MSwgeTIpO1xufVxuXG5jb25zdCByb29rOiBNb2JpbGl0eSA9ICh4MSwgeTEsIHgyLCB5MikgPT4ge1xuICByZXR1cm4geDEgPT09IHgyIHx8IHkxID09PSB5Mjtcbn1cblxuY29uc3QgcXVlZW46IE1vYmlsaXR5ID0gKHgxLCB5MSwgeDIsIHkyKSA9PiB7XG4gIHJldHVybiBiaXNob3AoeDEsIHkxLCB4MiwgeTIpIHx8IHJvb2soeDEsIHkxLCB4MiwgeTIpO1xufVxuXG5mdW5jdGlvbiBraW5nKGNvbG9yOiBjZy5Db2xvciwgcm9va0ZpbGVzOiBudW1iZXJbXSwgY2FuQ2FzdGxlOiBib29sZWFuKTogTW9iaWxpdHkge1xuICByZXR1cm4gKHgxLCB5MSwgeDIsIHkyKSAgPT4gKFxuICAgIGRpZmYoeDEsIHgyKSA8IDIgJiYgZGlmZih5MSwgeTIpIDwgMlxuICApIHx8IChcbiAgICBjYW5DYXN0bGUgJiYgeTEgPT09IHkyICYmIHkxID09PSAoY29sb3IgPT09ICd3aGl0ZScgPyAxIDogOCkgJiYgKFxuICAgICAgKHgxID09PSA1ICYmICh4MiA9PT0gMyB8fCB4MiA9PT0gNykpIHx8IHV0aWwuY29udGFpbnNYKHJvb2tGaWxlcywgeDIpXG4gICAgKVxuICApO1xufVxuXG4vLyBtYWtydWsvc2l0dHV5aW4gcXVlZW5cbmNvbnN0IG1ldDogTW9iaWxpdHkgPSAoeDEsIHkxLCB4MiwgeTIpID0+IHtcbiAgcmV0dXJuIGRpZmYoeDEsIHgyKSA9PT0gZGlmZih5MSwgeTIpICYmIGRpZmYoeDEsIHgyKSA9PT0gMTtcbn1cblxuLy8gY2FwYWJsYW5jYSBhcmNoYmlzaG9wLCBzZWlyYXdhbiBoYXdrXG5jb25zdCBhcmNoYmlzaG9wOiBNb2JpbGl0eSA9ICh4MSwgeTEsIHgyLCB5MikgPT4ge1xuICByZXR1cm4gYmlzaG9wKHgxLCB5MSwgeDIsIHkyKSB8fCBrbmlnaHQoeDEsIHkxLCB4MiwgeTIpO1xufVxuXG4vLyBjYXBhYmxhbmNhIGNhbmNlbGxvciwgc2VpcmF3YW4gZWxlcGhhbnRcbmNvbnN0IGNhbmNlbGxvcjogTW9iaWxpdHkgPSAoeDEsIHkxLCB4MiwgeTIpID0+IHtcbiAgcmV0dXJuIHJvb2soeDEsIHkxLCB4MiwgeTIpIHx8IGtuaWdodCh4MSwgeTEsIHgyLCB5Mik7XG59XG5cbi8vIHNob2dpIGxhbmNlXG5mdW5jdGlvbiBsYW5jZShjb2xvcjogY2cuQ29sb3IpOiBNb2JpbGl0eSB7XG4gIHJldHVybiAoeDEsIHkxLCB4MiwgeTIpID0+IChcbiAgICB4MiA9PT0geDEgJiYgKGNvbG9yID09PSAnd2hpdGUnID8geTIgPiB5MSA6IHkyIDwgeTEpXG4gICk7XG59XG5cbi8vIHNob2dpIHNpbHZlciwgbWFrcnVrL3NpdHR1eWluIGJpc2hvcFxuZnVuY3Rpb24gc2lsdmVyKGNvbG9yOiBjZy5Db2xvcik6IE1vYmlsaXR5IHtcbiAgcmV0dXJuICh4MSwgeTEsIHgyLCB5MikgID0+IChcbiAgICBtZXQoeDEsIHkxLCB4MiwgeTIpIHx8ICh4MSA9PT0geDIgJiYgKGNvbG9yID09PSAnd2hpdGUnID8geTIgPT09IHkxICsgMSA6IHkyID09PSB5MSAtIDEpKVxuICApO1xufVxuXG4vLyBzaG9naSBnb2xkLCBwcm9tb3RlZCBwYXduL2tuaWdodC9sYW5jZS9zaWx2ZXJcbmZ1bmN0aW9uIGdvbGQoY29sb3I6IGNnLkNvbG9yKTogTW9iaWxpdHkge1xuICByZXR1cm4gKHgxLCB5MSwgeDIsIHkyKSAgPT4gKFxuICAgIGRpZmYoeDEsIHgyKSA8IDIgJiYgZGlmZih5MSwgeTIpIDwgMiAmJiAoXG4gICAgICBjb2xvciA9PT0gJ3doaXRlJyA/XG4gICAgICAgICEoKHgyID09PSB4MSAtIDEgJiYgeTIgPT09IHkxIC0gMSkgfHwgKHgyID09PSB4MSArIDEgJiYgeTIgPT09IHkxIC0gMSkpIDpcbiAgICAgICAgISgoeDIgPT09IHgxICsgMSAmJiB5MiA9PT0geTEgKyAxKSB8fCAoeDIgPT09IHgxIC0gMSAmJiB5MiA9PT0geTEgKyAxKSlcbiAgICApXG4gICk7XG59XG5cbi8vIHNob2dpIHBhd25cbmZ1bmN0aW9uIHNwYXduKGNvbG9yOiBjZy5Db2xvcik6IE1vYmlsaXR5IHtcbiAgcmV0dXJuICh4MSwgeTEsIHgyLCB5MikgPT4gKHgyID09PSB4MSAmJiAoY29sb3IgPT09ICd3aGl0ZScgPyB5MiA9PT0geTEgKyAxIDogeTIgPT09IHkxIC0gMSkpO1xufVxuXG4vLyBzaG9naSBrbmlnaHRcbmZ1bmN0aW9uIHNrbmlnaHQoY29sb3I6IGNnLkNvbG9yKTogTW9iaWxpdHkge1xuICByZXR1cm4gKHgxLCB5MSwgeDIsIHkyKSA9PiBjb2xvciA9PT0gJ3doaXRlJyA/XG4gICAgKHkyID09PSB5MSArIDIgJiYgeDIgPT09IHgxIC0gMSB8fCB5MiA9PT0geTEgKyAyICYmIHgyID09PSB4MSArIDEpIDpcbiAgICAoeTIgPT09IHkxIC0gMiAmJiB4MiA9PT0geDEgLSAxIHx8IHkyID09PSB5MSAtIDIgJiYgeDIgPT09IHgxICsgMSk7XG59XG5cbi8vIHNob2dpIHByb21vdGVkIHJvb2tcbmNvbnN0IHByb29rOiBNb2JpbGl0eSA9ICh4MSwgeTEsIHgyLCB5MikgPT4ge1xuICByZXR1cm4gcm9vayh4MSwgeTEsIHgyLCB5MikgfHwgKGRpZmYoeDEsIHgyKSA8IDIgJiYgZGlmZih5MSwgeTIpIDwgMik7XG59XG5cbi8vIHNob2dpIHByb21vdGVkIGJpc2hvcFxuY29uc3QgcGJpc2hvcDogTW9iaWxpdHkgPSAoeDEsIHkxLCB4MiwgeTIpID0+IHtcbiAgcmV0dXJuIGJpc2hvcCh4MSwgeTEsIHgyLCB5MikgfHwgKGRpZmYoeDEsIHgyKSA8IDIgJiYgZGlmZih5MSwgeTIpIDwgMik7XG59XG5cbi8vIHNob2dpIGtpbmdcbmNvbnN0IHNraW5nOiBNb2JpbGl0eSA9ICh4MSwgeTEsIHgyLCB5MikgPT4ge1xuICByZXR1cm4gZGlmZih4MSwgeDIpIDwgMiAmJiBkaWZmKHkxLCB5MikgPCAyO1xufVxuXG4vLyB4aWFuZ3FpIHBhd25cbmZ1bmN0aW9uIHhwYXduKGNvbG9yOiBjZy5Db2xvcik6IE1vYmlsaXR5IHtcbiAgcmV0dXJuICh4MSwgeTEsIHgyLCB5MikgPT4gKFxuICAgICh4MiA9PT0geDEgJiYgKGNvbG9yID09PSAnd2hpdGUnID8geTIgPT09IHkxICsgMSA6IHkyID09PSB5MSAtIDEpKSB8fFxuICAgICh5MiA9PT0geTEgJiYgKHgyID09PSB4MSArIDEgfHwgeDIgPT09IHgxIC0gMSkgJiYgKGNvbG9yID09PSAnd2hpdGUnID8geTEgPiA1OiB5MSA8IDYpKVxuICAgICk7XG59XG5cbi8vIHhpYW5ncWkgYmlzaG9wXG5jb25zdCB4YmlzaG9wOiBNb2JpbGl0eSA9ICh4MSwgeTEsIHgyLCB5MikgPT4ge1xuICByZXR1cm4gZGlmZih4MSwgeDIpID09PSBkaWZmKHkxLCB5MikgJiYgZGlmZih4MSwgeDIpID09PSAyO1xufVxuXG4vLyB4aWFuZ3FpIGFkdmlzb3JcbmNvbnN0IGFkdmlzb3I6IE1vYmlsaXR5ID0gKHgxLCB5MSwgeDIsIHkyKSA9PiB7XG4gIHJldHVybiBkaWZmKHgxLCB4MikgPT09IGRpZmYoeTEsIHkyKSAmJiBkaWZmKHgxLCB4MikgPT09IDE7XG59XG5cbi8vIHhpYW5ncWkgZ2VuZXJhbChraW5nKVxuY29uc3QgeGtpbmc6IE1vYmlsaXR5ID0gKHgxLCB5MSwgeDIsIHkyKSA9PiB7XG4gIC8vIFRPRE86IGZseWluZyBnZW5lcmFsIGNhbiBjYXB0dXJlIG9wcCBnZW5lcmFsXG4gIHJldHVybiAoeDEgPT09IHgyIHx8IHkxID09PSB5MikgJiYgZGlmZih4MSwgeDIpID09PSAxO1xufVxuXG5mdW5jdGlvbiByb29rRmlsZXNPZihwaWVjZXM6IGNnLlBpZWNlcywgY29sb3I6IGNnLkNvbG9yLCBmaXJzdFJhbmtJczA6IGJvb2xlYW4pIHtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKHBpZWNlcykuZmlsdGVyKGtleSA9PiB7XG4gICAgY29uc3QgcGllY2UgPSBwaWVjZXNba2V5XTtcbiAgICByZXR1cm4gcGllY2UgJiYgcGllY2UuY29sb3IgPT09IGNvbG9yICYmIHBpZWNlLnJvbGUgPT09ICdyb29rJztcbiAgfSkubWFwKChrZXk6IHN0cmluZyApID0+IHV0aWwua2V5MnBvcyhrZXkgYXMgY2cuS2V5LCBmaXJzdFJhbmtJczApWzBdKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcHJlbW92ZShwaWVjZXM6IGNnLlBpZWNlcywga2V5OiBjZy5LZXksIGNhbkNhc3RsZTogYm9vbGVhbiwgZ2VvbTogY2cuR2VvbWV0cnkpOiBjZy5LZXlbXSB7XG4gIGNvbnN0IGZpcnN0UmFua0lzMCA9IGNnLmRpbWVuc2lvbnNbZ2VvbV0uaGVpZ2h0ID09PSAxMDtcbiAgY29uc3QgcGllY2UgPSBwaWVjZXNba2V5XSEsXG4gIHBvcyA9IHV0aWwua2V5MnBvcyhrZXksIGZpcnN0UmFua0lzMCk7XG4gIGxldCBtb2JpbGl0eTogTW9iaWxpdHk7XG4gIC8vIFBpZWNlIHByZW1vdmUgZGVwZW5kcyBvbiBjaGVzcyB2YXJpYW50IG5vdCBvbiBib2FyZCBnZW9tZXRyeSwgYnV0IHdlIHdpbGwgdXNlIGl0IGhlcmVcbiAgLy8gRi5lLiBzaG9naSBpcyBub3QgdGhlIG9ubHkgOXg5IHZhcmlhbnQsIHNlZSBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9KZXNvbl9Nb3JcbiAgc3dpdGNoIChnZW9tKSB7XG4gIGNhc2UgY2cuR2VvbWV0cnkuZGltOXgxMDpcbiAgICBzd2l0Y2ggKHBpZWNlLnJvbGUpIHtcbiAgICBjYXNlICdwYXduJzpcbiAgICAgIG1vYmlsaXR5ID0geHBhd24ocGllY2UuY29sb3IpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY2Fubm9uJzpcbiAgICBjYXNlICdyb29rJzpcbiAgICAgIG1vYmlsaXR5ID0gcm9vaztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2tuaWdodCc6XG4gICAgICBtb2JpbGl0eSA9IGtuaWdodDtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2Jpc2hvcCc6XG4gICAgICBtb2JpbGl0eSA9IHhiaXNob3A7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdhZHZpc29yJzpcbiAgICAgIG1vYmlsaXR5ID0gYWR2aXNvcjtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2tpbmcnOlxuICAgICAgbW9iaWxpdHkgPSB4a2luZztcbiAgICAgIGJyZWFrO1xuICAgIH07XG4gICAgYnJlYWs7XG4gIGNhc2UgY2cuR2VvbWV0cnkuZGltOXg5OlxuICAgIHN3aXRjaCAocGllY2Uucm9sZSkge1xuICAgIGNhc2UgJ3Bhd24nOlxuICAgICAgbW9iaWxpdHkgPSBzcGF3bihwaWVjZS5jb2xvcik7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdrbmlnaHQnOlxuICAgICAgbW9iaWxpdHkgPSBza25pZ2h0KHBpZWNlLmNvbG9yKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2Jpc2hvcCc6XG4gICAgICBtb2JpbGl0eSA9IGJpc2hvcDtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3Jvb2snOlxuICAgICAgbW9iaWxpdHkgPSByb29rO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAna2luZyc6XG4gICAgICBtb2JpbGl0eSA9IHNraW5nO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnc2lsdmVyJzpcbiAgICAgIG1vYmlsaXR5ID0gc2lsdmVyKHBpZWNlLmNvbG9yKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3BwYXduJzpcbiAgICBjYXNlICdwbGFuY2UnOlxuICAgIGNhc2UgJ3BrbmlnaHQnOlxuICAgIGNhc2UgJ3BzaWx2ZXInOlxuICAgIGNhc2UgJ2dvbGQnOlxuICAgICAgbW9iaWxpdHkgPSBnb2xkKHBpZWNlLmNvbG9yKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2xhbmNlJzpcbiAgICAgIG1vYmlsaXR5ID0gbGFuY2UocGllY2UuY29sb3IpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAncHJvb2snOlxuICAgICAgbW9iaWxpdHkgPSBwcm9vaztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3BiaXNob3AnOlxuICAgICAgbW9iaWxpdHkgPSBwYmlzaG9wO1xuICAgICAgYnJlYWs7XG4gICAgfTtcbiAgICBicmVhaztcbiAgZGVmYXVsdDpcbiAgICBzd2l0Y2ggKHBpZWNlLnJvbGUpIHtcbiAgICBjYXNlICdwYXduJzpcbiAgICAgIG1vYmlsaXR5ID0gcGF3bihwaWVjZS5jb2xvcik7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdrbmlnaHQnOlxuICAgICAgbW9iaWxpdHkgPSBrbmlnaHQ7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdiaXNob3AnOlxuICAgICAgbW9iaWxpdHkgPSBiaXNob3A7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdyb29rJzpcbiAgICAgIG1vYmlsaXR5ID0gcm9vaztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3F1ZWVuJzpcbiAgICAgIG1vYmlsaXR5ID0gcXVlZW47XG4gICAgICBicmVhaztcbiAgICBjYXNlICdraW5nJzpcbiAgICAgIG1vYmlsaXR5ID0ga2luZyhwaWVjZS5jb2xvciwgcm9va0ZpbGVzT2YocGllY2VzLCBwaWVjZS5jb2xvciwgZmlyc3RSYW5rSXMwKSwgY2FuQ2FzdGxlKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2hhd2snOlxuICAgIGNhc2UgJ2FyY2hiaXNob3AnOlxuICAgICAgbW9iaWxpdHkgPSBhcmNoYmlzaG9wO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnZWxlcGhhbnQnOlxuICAgIGNhc2UgJ2NhbmNlbGxvcic6XG4gICAgICBtb2JpbGl0eSA9IGNhbmNlbGxvcjtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ21ldCc6XG4gICAgY2FzZSAnZmVyeic6XG4gICAgICBtb2JpbGl0eSA9IG1ldDtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3NpbHZlcic6XG4gICAgICBtb2JpbGl0eSA9IHNpbHZlcihwaWVjZS5jb2xvcik7XG4gICAgICBicmVhaztcbiAgICB9O1xuICAgIGJyZWFrO1xuICB9O1xuICBjb25zdCBhbGxrZXlzID0gdXRpbC5hbGxLZXlzW2dlb21dO1xuXG4gIGNvbnN0IHBvczJrZXlHZW9tID0gKGdlb206IGNnLkdlb21ldHJ5KSA9PiAoIChwb3M6IGNnLlBvcykgPT4gdXRpbC5wb3Mya2V5KHBvcywgZ2VvbSkgKTtcbiAgY29uc3QgcG9zMmtleSA9IHBvczJrZXlHZW9tKGdlb20pO1xuXG4gIGNvbnN0IGtleTJwb3NSYW5rMCA9IChmaXJzdHJhbmswOiBib29sZWFuKSA9PiAoIChrZXk6IGNnLktleSkgPT4gdXRpbC5rZXkycG9zKGtleSwgZmlyc3RyYW5rMCkgKTtcbiAgY29uc3Qga2V5MnBvcyA9IGtleTJwb3NSYW5rMChmaXJzdFJhbmtJczApO1xuXG4gIHJldHVybiBhbGxrZXlzLm1hcChrZXkycG9zKS5maWx0ZXIocG9zMiA9PiB7XG4gICAgcmV0dXJuIChwb3NbMF0gIT09IHBvczJbMF0gfHwgcG9zWzFdICE9PSBwb3MyWzFdKSAmJiBtb2JpbGl0eShwb3NbMF0sIHBvc1sxXSwgcG9zMlswXSwgcG9zMlsxXSk7XG4gIH0pLm1hcChwb3Mya2V5KTtcbn07XG4iLCJpbXBvcnQgeyBTdGF0ZSB9IGZyb20gJy4vc3RhdGUnXG5pbXBvcnQgeyBrZXkycG9zLCBjcmVhdGVFbCB9IGZyb20gJy4vdXRpbCdcbmltcG9ydCB7IHdoaXRlUG92IH0gZnJvbSAnLi9ib2FyZCdcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAnLi91dGlsJ1xuaW1wb3J0IHsgQW5pbUN1cnJlbnQsIEFuaW1WZWN0b3JzLCBBbmltVmVjdG9yLCBBbmltRmFkaW5ncyB9IGZyb20gJy4vYW5pbSdcbmltcG9ydCB7IERyYWdDdXJyZW50IH0gZnJvbSAnLi9kcmFnJ1xuaW1wb3J0ICogYXMgY2cgZnJvbSAnLi90eXBlcydcblxuLy8gYCRjb2xvciAkcm9sZWBcbnR5cGUgUGllY2VOYW1lID0gc3RyaW5nO1xuXG5pbnRlcmZhY2UgU2FtZVBpZWNlcyB7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfVxuaW50ZXJmYWNlIFNhbWVTcXVhcmVzIHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9XG5pbnRlcmZhY2UgTW92ZWRQaWVjZXMgeyBbcGllY2VOYW1lOiBzdHJpbmddOiBjZy5QaWVjZU5vZGVbXSB9XG5pbnRlcmZhY2UgTW92ZWRTcXVhcmVzIHsgW2NsYXNzTmFtZTogc3RyaW5nXTogY2cuU3F1YXJlTm9kZVtdIH1cbmludGVyZmFjZSBTcXVhcmVDbGFzc2VzIHsgW2tleTogc3RyaW5nXTogc3RyaW5nIH1cblxuLy8gcG9ydGVkIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL3ZlbG9jZS9saWNob2JpbGUvYmxvYi9tYXN0ZXIvc3JjL2pzL2NoZXNzZ3JvdW5kL3ZpZXcuanNcbi8vIGluIGNhc2Ugb2YgYnVncywgYmxhbWUgQHZlbG9jZVxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmVuZGVyKHM6IFN0YXRlKTogdm9pZCB7XG4gIGNvbnN0IGZpcnN0UmFua0lzMCA9IHMuZGltZW5zaW9ucy5oZWlnaHQgPT09IDEwO1xuICBjb25zdCBhc1doaXRlOiBib29sZWFuID0gd2hpdGVQb3YocyksXG4gIHBvc1RvVHJhbnNsYXRlID0gcy5kb20ucmVsYXRpdmUgPyB1dGlsLnBvc1RvVHJhbnNsYXRlUmVsIDogdXRpbC5wb3NUb1RyYW5zbGF0ZUFicyhzLmRvbS5ib3VuZHMoKSwgcy5kaW1lbnNpb25zKSxcbiAgdHJhbnNsYXRlID0gcy5kb20ucmVsYXRpdmUgPyB1dGlsLnRyYW5zbGF0ZVJlbCA6IHV0aWwudHJhbnNsYXRlQWJzLFxuICBib2FyZEVsOiBIVE1MRWxlbWVudCA9IHMuZG9tLmVsZW1lbnRzLmJvYXJkLFxuICBwaWVjZXM6IGNnLlBpZWNlcyA9IHMucGllY2VzLFxuICBjdXJBbmltOiBBbmltQ3VycmVudCB8IHVuZGVmaW5lZCA9IHMuYW5pbWF0aW9uLmN1cnJlbnQsXG4gIGFuaW1zOiBBbmltVmVjdG9ycyA9IGN1ckFuaW0gPyBjdXJBbmltLnBsYW4uYW5pbXMgOiB7fSxcbiAgZmFkaW5nczogQW5pbUZhZGluZ3MgPSBjdXJBbmltID8gY3VyQW5pbS5wbGFuLmZhZGluZ3MgOiB7fSxcbiAgY3VyRHJhZzogRHJhZ0N1cnJlbnQgfCB1bmRlZmluZWQgPSBzLmRyYWdnYWJsZS5jdXJyZW50LFxuICBzcXVhcmVzOiBTcXVhcmVDbGFzc2VzID0gY29tcHV0ZVNxdWFyZUNsYXNzZXMocyksXG4gIHNhbWVQaWVjZXM6IFNhbWVQaWVjZXMgPSB7fSxcbiAgc2FtZVNxdWFyZXM6IFNhbWVTcXVhcmVzID0ge30sXG4gIG1vdmVkUGllY2VzOiBNb3ZlZFBpZWNlcyA9IHt9LFxuICBtb3ZlZFNxdWFyZXM6IE1vdmVkU3F1YXJlcyA9IHt9LFxuICBwaWVjZXNLZXlzOiBjZy5LZXlbXSA9IE9iamVjdC5rZXlzKHBpZWNlcykgYXMgY2cuS2V5W107XG4gIGxldCBrOiBjZy5LZXksXG4gIHA6IGNnLlBpZWNlIHwgdW5kZWZpbmVkLFxuICBlbDogY2cuUGllY2VOb2RlIHwgY2cuU3F1YXJlTm9kZSxcbiAgcGllY2VBdEtleTogY2cuUGllY2UgfCB1bmRlZmluZWQsXG4gIGVsUGllY2VOYW1lOiBQaWVjZU5hbWUsXG4gIGFuaW06IEFuaW1WZWN0b3IgfCB1bmRlZmluZWQsXG4gIGZhZGluZzogY2cuUGllY2UgfCB1bmRlZmluZWQsXG4gIHBNdmRzZXQ6IGNnLlBpZWNlTm9kZVtdLFxuICBwTXZkOiBjZy5QaWVjZU5vZGUgfCB1bmRlZmluZWQsXG4gIHNNdmRzZXQ6IGNnLlNxdWFyZU5vZGVbXSxcbiAgc012ZDogY2cuU3F1YXJlTm9kZSB8IHVuZGVmaW5lZDtcblxuICAvLyB3YWxrIG92ZXIgYWxsIGJvYXJkIGRvbSBlbGVtZW50cywgYXBwbHkgYW5pbWF0aW9ucyBhbmQgZmxhZyBtb3ZlZCBwaWVjZXNcbiAgZWwgPSBib2FyZEVsLmZpcnN0Q2hpbGQgYXMgY2cuUGllY2VOb2RlIHwgY2cuU3F1YXJlTm9kZTtcbiAgd2hpbGUgKGVsKSB7XG4gICAgayA9IGVsLmNnS2V5O1xuICAgIGlmIChpc1BpZWNlTm9kZShlbCkpIHtcbiAgICAgIHBpZWNlQXRLZXkgPSBwaWVjZXNba107XG4gICAgICBhbmltID0gYW5pbXNba107XG4gICAgICBmYWRpbmcgPSBmYWRpbmdzW2tdO1xuICAgICAgZWxQaWVjZU5hbWUgPSBlbC5jZ1BpZWNlO1xuICAgICAgLy8gaWYgcGllY2Ugbm90IGJlaW5nIGRyYWdnZWQgYW55bW9yZSwgcmVtb3ZlIGRyYWdnaW5nIHN0eWxlXG4gICAgICBpZiAoZWwuY2dEcmFnZ2luZyAmJiAoIWN1ckRyYWcgfHwgY3VyRHJhZy5vcmlnICE9PSBrKSkge1xuICAgICAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKCdkcmFnZ2luZycpO1xuICAgICAgICB0cmFuc2xhdGUoZWwsIHBvc1RvVHJhbnNsYXRlKGtleTJwb3MoaywgZmlyc3RSYW5rSXMwKSwgYXNXaGl0ZSwgcy5kaW1lbnNpb25zKSk7XG4gICAgICAgIGVsLmNnRHJhZ2dpbmcgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8vIHJlbW92ZSBmYWRpbmcgY2xhc3MgaWYgaXQgc3RpbGwgcmVtYWluc1xuICAgICAgaWYgKCFmYWRpbmcgJiYgZWwuY2dGYWRpbmcpIHtcbiAgICAgICAgZWwuY2dGYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZSgnZmFkaW5nJyk7XG4gICAgICB9XG4gICAgICAvLyB0aGVyZSBpcyBub3cgYSBwaWVjZSBhdCB0aGlzIGRvbSBrZXlcbiAgICAgIGlmIChwaWVjZUF0S2V5KSB7XG4gICAgICAgIC8vIGNvbnRpbnVlIGFuaW1hdGlvbiBpZiBhbHJlYWR5IGFuaW1hdGluZyBhbmQgc2FtZSBwaWVjZVxuICAgICAgICAvLyAob3RoZXJ3aXNlIGl0IGNvdWxkIGFuaW1hdGUgYSBjYXB0dXJlZCBwaWVjZSlcbiAgICAgICAgaWYgKGFuaW0gJiYgZWwuY2dBbmltYXRpbmcgJiYgZWxQaWVjZU5hbWUgPT09IHBpZWNlTmFtZU9mKHBpZWNlQXRLZXkpKSB7XG4gICAgICAgICAgY29uc3QgcG9zID0ga2V5MnBvcyhrLCBmaXJzdFJhbmtJczApO1xuICAgICAgICAgIHBvc1swXSArPSBhbmltWzJdO1xuICAgICAgICAgIHBvc1sxXSArPSBhbmltWzNdO1xuICAgICAgICAgIGVsLmNsYXNzTGlzdC5hZGQoJ2FuaW0nKTtcbiAgICAgICAgICB0cmFuc2xhdGUoZWwsIHBvc1RvVHJhbnNsYXRlKHBvcywgYXNXaGl0ZSwgcy5kaW1lbnNpb25zKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoZWwuY2dBbmltYXRpbmcpIHtcbiAgICAgICAgICBlbC5jZ0FuaW1hdGluZyA9IGZhbHNlO1xuICAgICAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoJ2FuaW0nKTtcbiAgICAgICAgICB0cmFuc2xhdGUoZWwsIHBvc1RvVHJhbnNsYXRlKGtleTJwb3MoaywgZmlyc3RSYW5rSXMwKSwgYXNXaGl0ZSwgcy5kaW1lbnNpb25zKSk7XG4gICAgICAgICAgaWYgKHMuYWRkUGllY2VaSW5kZXgpIGVsLnN0eWxlLnpJbmRleCA9IHBvc1pJbmRleChrZXkycG9zKGssIGZpcnN0UmFua0lzMCksIGFzV2hpdGUpO1xuICAgICAgICB9XG4gICAgICAgIC8vIHNhbWUgcGllY2U6IGZsYWcgYXMgc2FtZVxuICAgICAgICBpZiAoZWxQaWVjZU5hbWUgPT09IHBpZWNlTmFtZU9mKHBpZWNlQXRLZXkpICYmICghZmFkaW5nIHx8ICFlbC5jZ0ZhZGluZykpIHtcbiAgICAgICAgICBzYW1lUGllY2VzW2tdID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBkaWZmZXJlbnQgcGllY2U6IGZsYWcgYXMgbW92ZWQgdW5sZXNzIGl0IGlzIGEgZmFkaW5nIHBpZWNlXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGlmIChmYWRpbmcgJiYgZWxQaWVjZU5hbWUgPT09IHBpZWNlTmFtZU9mKGZhZGluZykpIHtcbiAgICAgICAgICAgIGVsLmNsYXNzTGlzdC5hZGQoJ2ZhZGluZycpO1xuICAgICAgICAgICAgZWwuY2dGYWRpbmcgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAobW92ZWRQaWVjZXNbZWxQaWVjZU5hbWVdKSBtb3ZlZFBpZWNlc1tlbFBpZWNlTmFtZV0ucHVzaChlbCk7XG4gICAgICAgICAgICBlbHNlIG1vdmVkUGllY2VzW2VsUGllY2VOYW1lXSA9IFtlbF07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBubyBwaWVjZTogZmxhZyBhcyBtb3ZlZFxuICAgICAgZWxzZSB7XG4gICAgICAgIGlmIChtb3ZlZFBpZWNlc1tlbFBpZWNlTmFtZV0pIG1vdmVkUGllY2VzW2VsUGllY2VOYW1lXS5wdXNoKGVsKTtcbiAgICAgICAgZWxzZSBtb3ZlZFBpZWNlc1tlbFBpZWNlTmFtZV0gPSBbZWxdO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmIChpc1NxdWFyZU5vZGUoZWwpKSB7XG4gICAgICBjb25zdCBjbiA9IGVsLmNsYXNzTmFtZTtcbiAgICAgIGlmIChzcXVhcmVzW2tdID09PSBjbikgc2FtZVNxdWFyZXNba10gPSB0cnVlO1xuICAgICAgZWxzZSBpZiAobW92ZWRTcXVhcmVzW2NuXSkgbW92ZWRTcXVhcmVzW2NuXS5wdXNoKGVsKTtcbiAgICAgIGVsc2UgbW92ZWRTcXVhcmVzW2NuXSA9IFtlbF07XG4gICAgfVxuICAgIGVsID0gZWwubmV4dFNpYmxpbmcgYXMgY2cuUGllY2VOb2RlIHwgY2cuU3F1YXJlTm9kZTtcbiAgfVxuXG4gIC8vIHdhbGsgb3ZlciBhbGwgc3F1YXJlcyBpbiBjdXJyZW50IHNldCwgYXBwbHkgZG9tIGNoYW5nZXMgdG8gbW92ZWQgc3F1YXJlc1xuICAvLyBvciBhcHBlbmQgbmV3IHNxdWFyZXNcbiAgZm9yIChjb25zdCBzayBpbiBzcXVhcmVzKSB7XG4gICAgaWYgKCFzYW1lU3F1YXJlc1tza10pIHtcbiAgICAgIHNNdmRzZXQgPSBtb3ZlZFNxdWFyZXNbc3F1YXJlc1tza11dO1xuICAgICAgc012ZCA9IHNNdmRzZXQgJiYgc012ZHNldC5wb3AoKTtcbiAgICAgIGNvbnN0IHRyYW5zbGF0aW9uID0gcG9zVG9UcmFuc2xhdGUoa2V5MnBvcyhzayBhcyBjZy5LZXksIGZpcnN0UmFua0lzMCksIGFzV2hpdGUsIHMuZGltZW5zaW9ucyk7XG4gICAgICBpZiAoc012ZCkge1xuICAgICAgICBzTXZkLmNnS2V5ID0gc2sgYXMgY2cuS2V5O1xuICAgICAgICB0cmFuc2xhdGUoc012ZCwgdHJhbnNsYXRpb24pO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGNvbnN0IHNxdWFyZU5vZGUgPSBjcmVhdGVFbCgnc3F1YXJlJywgc3F1YXJlc1tza10pIGFzIGNnLlNxdWFyZU5vZGU7XG4gICAgICAgIHNxdWFyZU5vZGUuY2dLZXkgPSBzayBhcyBjZy5LZXk7XG4gICAgICAgIHRyYW5zbGF0ZShzcXVhcmVOb2RlLCB0cmFuc2xhdGlvbik7XG4gICAgICAgIGJvYXJkRWwuaW5zZXJ0QmVmb3JlKHNxdWFyZU5vZGUsIGJvYXJkRWwuZmlyc3RDaGlsZCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gd2FsayBvdmVyIGFsbCBwaWVjZXMgaW4gY3VycmVudCBzZXQsIGFwcGx5IGRvbSBjaGFuZ2VzIHRvIG1vdmVkIHBpZWNlc1xuICAvLyBvciBhcHBlbmQgbmV3IHBpZWNlc1xuICBmb3IgKGNvbnN0IGogaW4gcGllY2VzS2V5cykge1xuICAgIGsgPSBwaWVjZXNLZXlzW2pdO1xuICAgIHAgPSBwaWVjZXNba10hO1xuICAgIGFuaW0gPSBhbmltc1trXTtcbiAgICBpZiAoIXNhbWVQaWVjZXNba10pIHtcbiAgICAgIHBNdmRzZXQgPSBtb3ZlZFBpZWNlc1twaWVjZU5hbWVPZihwKV07XG4gICAgICBwTXZkID0gcE12ZHNldCAmJiBwTXZkc2V0LnBvcCgpO1xuICAgICAgLy8gYSBzYW1lIHBpZWNlIHdhcyBtb3ZlZFxuICAgICAgaWYgKHBNdmQpIHtcbiAgICAgICAgLy8gYXBwbHkgZG9tIGNoYW5nZXNcbiAgICAgICAgcE12ZC5jZ0tleSA9IGs7XG4gICAgICAgIGlmIChwTXZkLmNnRmFkaW5nKSB7XG4gICAgICAgICAgcE12ZC5jbGFzc0xpc3QucmVtb3ZlKCdmYWRpbmcnKTtcbiAgICAgICAgICBwTXZkLmNnRmFkaW5nID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcG9zID0ga2V5MnBvcyhrLCBmaXJzdFJhbmtJczApO1xuICAgICAgICBpZiAocy5hZGRQaWVjZVpJbmRleCkgcE12ZC5zdHlsZS56SW5kZXggPSBwb3NaSW5kZXgocG9zLCBhc1doaXRlKTtcbiAgICAgICAgaWYgKGFuaW0pIHtcbiAgICAgICAgICBwTXZkLmNnQW5pbWF0aW5nID0gdHJ1ZTtcbiAgICAgICAgICBwTXZkLmNsYXNzTGlzdC5hZGQoJ2FuaW0nKTtcbiAgICAgICAgICBwb3NbMF0gKz0gYW5pbVsyXTtcbiAgICAgICAgICBwb3NbMV0gKz0gYW5pbVszXTtcbiAgICAgICAgfVxuICAgICAgICB0cmFuc2xhdGUocE12ZCwgcG9zVG9UcmFuc2xhdGUocG9zLCBhc1doaXRlLCBzLmRpbWVuc2lvbnMpKTtcbiAgICAgIH1cbiAgICAgIC8vIG5vIHBpZWNlIGluIG1vdmVkIG9iajogaW5zZXJ0IHRoZSBuZXcgcGllY2VcbiAgICAgIC8vIGFzc3VtZXMgdGhlIG5ldyBwaWVjZSBpcyBub3QgYmVpbmcgZHJhZ2dlZFxuICAgICAgZWxzZSB7XG5cbiAgICAgICAgY29uc3QgcGllY2VOYW1lID0gcGllY2VOYW1lT2YocCksXG4gICAgICAgIHBpZWNlTm9kZSA9IGNyZWF0ZUVsKCdwaWVjZScsIHBpZWNlTmFtZSkgYXMgY2cuUGllY2VOb2RlLFxuICAgICAgICBwb3MgPSBrZXkycG9zKGssIGZpcnN0UmFua0lzMCk7XG5cbiAgICAgICAgcGllY2VOb2RlLmNnUGllY2UgPSBwaWVjZU5hbWU7XG4gICAgICAgIHBpZWNlTm9kZS5jZ0tleSA9IGs7XG4gICAgICAgIGlmIChhbmltKSB7XG4gICAgICAgICAgcGllY2VOb2RlLmNnQW5pbWF0aW5nID0gdHJ1ZTtcbiAgICAgICAgICBwb3NbMF0gKz0gYW5pbVsyXTtcbiAgICAgICAgICBwb3NbMV0gKz0gYW5pbVszXTtcbiAgICAgICAgfVxuICAgICAgICB0cmFuc2xhdGUocGllY2VOb2RlLCBwb3NUb1RyYW5zbGF0ZShwb3MsIGFzV2hpdGUsIHMuZGltZW5zaW9ucykpO1xuXG4gICAgICAgIGlmIChzLmFkZFBpZWNlWkluZGV4KSBwaWVjZU5vZGUuc3R5bGUuekluZGV4ID0gcG9zWkluZGV4KHBvcywgYXNXaGl0ZSk7XG5cbiAgICAgICAgYm9hcmRFbC5hcHBlbmRDaGlsZChwaWVjZU5vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIHJlbW92ZSBhbnkgZWxlbWVudCB0aGF0IHJlbWFpbnMgaW4gdGhlIG1vdmVkIHNldHNcbiAgZm9yIChjb25zdCBpIGluIG1vdmVkUGllY2VzKSByZW1vdmVOb2RlcyhzLCBtb3ZlZFBpZWNlc1tpXSk7XG4gIGZvciAoY29uc3QgaSBpbiBtb3ZlZFNxdWFyZXMpIHJlbW92ZU5vZGVzKHMsIG1vdmVkU3F1YXJlc1tpXSk7XG59XG5cbmZ1bmN0aW9uIGlzUGllY2VOb2RlKGVsOiBjZy5QaWVjZU5vZGUgfCBjZy5TcXVhcmVOb2RlKTogZWwgaXMgY2cuUGllY2VOb2RlIHtcbiAgcmV0dXJuIGVsLnRhZ05hbWUgPT09ICdQSUVDRSc7XG59XG5mdW5jdGlvbiBpc1NxdWFyZU5vZGUoZWw6IGNnLlBpZWNlTm9kZSB8IGNnLlNxdWFyZU5vZGUpOiBlbCBpcyBjZy5TcXVhcmVOb2RlIHtcbiAgcmV0dXJuIGVsLnRhZ05hbWUgPT09ICdTUVVBUkUnO1xufVxuXG5mdW5jdGlvbiByZW1vdmVOb2RlcyhzOiBTdGF0ZSwgbm9kZXM6IEhUTUxFbGVtZW50W10pOiB2b2lkIHtcbiAgZm9yIChjb25zdCBpIGluIG5vZGVzKSBzLmRvbS5lbGVtZW50cy5ib2FyZC5yZW1vdmVDaGlsZChub2Rlc1tpXSk7XG59XG5cbmZ1bmN0aW9uIHBvc1pJbmRleChwb3M6IGNnLlBvcywgYXNXaGl0ZTogYm9vbGVhbik6IHN0cmluZyB7XG4gIGxldCB6ID0gMiArIChwb3NbMV0gLSAxKSAqIDggKyAoOCAtIHBvc1swXSk7XG4gIGlmIChhc1doaXRlKSB6ID0gNjcgLSB6O1xuICByZXR1cm4geiArICcnO1xufVxuXG5mdW5jdGlvbiBwaWVjZU5hbWVPZihwaWVjZTogY2cuUGllY2UpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7cGllY2UuY29sb3J9ICR7cGllY2Uucm9sZX1gO1xufVxuXG5mdW5jdGlvbiBjb21wdXRlU3F1YXJlQ2xhc3NlcyhzOiBTdGF0ZSk6IFNxdWFyZUNsYXNzZXMge1xuICBjb25zdCBzcXVhcmVzOiBTcXVhcmVDbGFzc2VzID0ge307XG4gIGxldCBpOiBhbnksIGs6IGNnLktleTtcbiAgaWYgKHMubGFzdE1vdmUgJiYgcy5oaWdobGlnaHQubGFzdE1vdmUpIGZvciAoaSBpbiBzLmxhc3RNb3ZlKSB7XG4gICAgaWYgKHMubGFzdE1vdmVbaV0gIT0gJ3owJykge1xuICAgICAgYWRkU3F1YXJlKHNxdWFyZXMsIHMubGFzdE1vdmVbaV0sICdsYXN0LW1vdmUnKTtcbiAgICB9XG4gIH1cbiAgaWYgKHMuY2hlY2sgJiYgcy5oaWdobGlnaHQuY2hlY2spIGFkZFNxdWFyZShzcXVhcmVzLCBzLmNoZWNrLCAnY2hlY2snKTtcbiAgaWYgKHMuc2VsZWN0ZWQpIHtcbiAgICBpZiAocy5zZWxlY3RlZCAhPSAnejAnKSB7XG4gICAgICBhZGRTcXVhcmUoc3F1YXJlcywgcy5zZWxlY3RlZCwgJ3NlbGVjdGVkJyk7XG4gICAgfVxuICAgIGlmIChzLm1vdmFibGUuc2hvd0Rlc3RzKSB7XG4gICAgICBjb25zdCBkZXN0cyA9IHMubW92YWJsZS5kZXN0cyAmJiBzLm1vdmFibGUuZGVzdHNbcy5zZWxlY3RlZF07XG4gICAgICBpZiAoZGVzdHMpIGZvciAoaSBpbiBkZXN0cykge1xuICAgICAgICBrID0gZGVzdHNbaV07XG4gICAgICAgIGFkZFNxdWFyZShzcXVhcmVzLCBrLCAnbW92ZS1kZXN0JyArIChzLnBpZWNlc1trXSA/ICcgb2MnIDogJycpKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBEZXN0cyA9IHMucHJlbW92YWJsZS5kZXN0cztcbiAgICAgIGlmIChwRGVzdHMpIGZvciAoaSBpbiBwRGVzdHMpIHtcbiAgICAgICAgayA9IHBEZXN0c1tpXTtcbiAgICAgICAgYWRkU3F1YXJlKHNxdWFyZXMsIGssICdwcmVtb3ZlLWRlc3QnICsgKHMucGllY2VzW2tdID8gJyBvYycgOiAnJykpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBjb25zdCBwcmVtb3ZlID0gcy5wcmVtb3ZhYmxlLmN1cnJlbnQ7XG4gIGlmIChwcmVtb3ZlKSBmb3IgKGkgaW4gcHJlbW92ZSkgYWRkU3F1YXJlKHNxdWFyZXMsIHByZW1vdmVbaV0sICdjdXJyZW50LXByZW1vdmUnKTtcbiAgZWxzZSBpZiAocy5wcmVkcm9wcGFibGUuY3VycmVudCkgYWRkU3F1YXJlKHNxdWFyZXMsIHMucHJlZHJvcHBhYmxlLmN1cnJlbnQua2V5LCAnY3VycmVudC1wcmVtb3ZlJyk7XG5cbiAgY29uc3QgbyA9IHMuZXhwbG9kaW5nO1xuICBpZiAobykgZm9yIChpIGluIG8ua2V5cykgYWRkU3F1YXJlKHNxdWFyZXMsIG8ua2V5c1tpXSwgJ2V4cGxvZGluZycgKyBvLnN0YWdlKTtcblxuICByZXR1cm4gc3F1YXJlcztcbn1cblxuZnVuY3Rpb24gYWRkU3F1YXJlKHNxdWFyZXM6IFNxdWFyZUNsYXNzZXMsIGtleTogY2cuS2V5LCBrbGFzczogc3RyaW5nKTogdm9pZCB7XG4gIGlmIChzcXVhcmVzW2tleV0pIHNxdWFyZXNba2V5XSArPSAnICcgKyBrbGFzcztcbiAgZWxzZSBzcXVhcmVzW2tleV0gPSBrbGFzcztcbn1cbiIsImltcG9ydCAqIGFzIGZlbiBmcm9tICcuL2ZlbidcbmltcG9ydCB7IEFuaW1DdXJyZW50IH0gZnJvbSAnLi9hbmltJ1xuaW1wb3J0IHsgRHJhZ0N1cnJlbnQgfSBmcm9tICcuL2RyYWcnXG5pbXBvcnQgeyBEcmF3YWJsZSB9IGZyb20gJy4vZHJhdydcbmltcG9ydCB7IHRpbWVyIH0gZnJvbSAnLi91dGlsJ1xuaW1wb3J0ICogYXMgY2cgZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3RhdGUge1xuICBwaWVjZXM6IGNnLlBpZWNlcztcbiAgb3JpZW50YXRpb246IGNnLkNvbG9yOyAvLyBib2FyZCBvcmllbnRhdGlvbi4gd2hpdGUgfCBibGFja1xuICB0dXJuQ29sb3I6IGNnLkNvbG9yOyAvLyB0dXJuIHRvIHBsYXkuIHdoaXRlIHwgYmxhY2tcbiAgY2hlY2s/OiBjZy5LZXk7IC8vIHNxdWFyZSBjdXJyZW50bHkgaW4gY2hlY2sgXCJhMlwiXG4gIGxhc3RNb3ZlPzogY2cuS2V5W107IC8vIHNxdWFyZXMgcGFydCBvZiB0aGUgbGFzdCBtb3ZlIFtcImMzXCI7IFwiYzRcIl1cbiAgc2VsZWN0ZWQ/OiBjZy5LZXk7IC8vIHNxdWFyZSBjdXJyZW50bHkgc2VsZWN0ZWQgXCJhMVwiXG4gIGNvb3JkaW5hdGVzOiBib29sZWFuOyAvLyBpbmNsdWRlIGNvb3JkcyBhdHRyaWJ1dGVzXG4gIGF1dG9DYXN0bGU6IGJvb2xlYW47IC8vIGltbWVkaWF0ZWx5IGNvbXBsZXRlIHRoZSBjYXN0bGUgYnkgbW92aW5nIHRoZSByb29rIGFmdGVyIGtpbmcgbW92ZVxuICB2aWV3T25seTogYm9vbGVhbjsgLy8gZG9uJ3QgYmluZCBldmVudHM6IHRoZSB1c2VyIHdpbGwgbmV2ZXIgYmUgYWJsZSB0byBtb3ZlIHBpZWNlcyBhcm91bmRcbiAgZGlzYWJsZUNvbnRleHRNZW51OiBib29sZWFuOyAvLyBiZWNhdXNlIHdobyBuZWVkcyBhIGNvbnRleHQgbWVudSBvbiBhIGNoZXNzYm9hcmRcbiAgcmVzaXphYmxlOiBib29sZWFuOyAvLyBsaXN0ZW5zIHRvIGNoZXNzZ3JvdW5kLnJlc2l6ZSBvbiBkb2N1bWVudC5ib2R5IHRvIGNsZWFyIGJvdW5kcyBjYWNoZVxuICBhZGRQaWVjZVpJbmRleDogYm9vbGVhbjsgLy8gYWRkcyB6LWluZGV4IHZhbHVlcyB0byBwaWVjZXMgKGZvciAzRClcbiAgcGllY2VLZXk6IGJvb2xlYW47IC8vIGFkZCBhIGRhdGEta2V5IGF0dHJpYnV0ZSB0byBwaWVjZSBlbGVtZW50c1xuICBoaWdobGlnaHQ6IHtcbiAgICBsYXN0TW92ZTogYm9vbGVhbjsgLy8gYWRkIGxhc3QtbW92ZSBjbGFzcyB0byBzcXVhcmVzXG4gICAgY2hlY2s6IGJvb2xlYW47IC8vIGFkZCBjaGVjayBjbGFzcyB0byBzcXVhcmVzXG4gIH07XG4gIGFuaW1hdGlvbjoge1xuICAgIGVuYWJsZWQ6IGJvb2xlYW47XG4gICAgZHVyYXRpb246IG51bWJlcjtcbiAgICBjdXJyZW50PzogQW5pbUN1cnJlbnQ7XG4gIH07XG4gIG1vdmFibGU6IHtcbiAgICBmcmVlOiBib29sZWFuOyAvLyBhbGwgbW92ZXMgYXJlIHZhbGlkIC0gYm9hcmQgZWRpdG9yXG4gICAgY29sb3I/OiBjZy5Db2xvciB8ICdib3RoJzsgLy8gY29sb3IgdGhhdCBjYW4gbW92ZS4gd2hpdGUgfCBibGFjayB8IGJvdGhcbiAgICBkZXN0cz86IGNnLkRlc3RzOyAvLyB2YWxpZCBtb3Zlcy4ge1wiYTJcIiBbXCJhM1wiIFwiYTRcIl0gXCJiMVwiIFtcImEzXCIgXCJjM1wiXX1cbiAgICBzaG93RGVzdHM6IGJvb2xlYW47IC8vIHdoZXRoZXIgdG8gYWRkIHRoZSBtb3ZlLWRlc3QgY2xhc3Mgb24gc3F1YXJlc1xuICAgIGV2ZW50czoge1xuICAgICAgYWZ0ZXI/OiAob3JpZzogY2cuS2V5LCBkZXN0OiBjZy5LZXksIG1ldGFkYXRhOiBjZy5Nb3ZlTWV0YWRhdGEpID0+IHZvaWQ7IC8vIGNhbGxlZCBhZnRlciB0aGUgbW92ZSBoYXMgYmVlbiBwbGF5ZWRcbiAgICAgIGFmdGVyTmV3UGllY2U/OiAocm9sZTogY2cuUm9sZSwga2V5OiBjZy5LZXksIG1ldGFkYXRhOiBjZy5Nb3ZlTWV0YWRhdGEpID0+IHZvaWQ7IC8vIGNhbGxlZCBhZnRlciBhIG5ldyBwaWVjZSBpcyBkcm9wcGVkIG9uIHRoZSBib2FyZFxuICAgIH07XG4gICAgcm9va0Nhc3RsZTogYm9vbGVhbiAvLyBjYXN0bGUgYnkgbW92aW5nIHRoZSBraW5nIHRvIHRoZSByb29rXG4gIH07XG4gIHByZW1vdmFibGU6IHtcbiAgICBlbmFibGVkOiBib29sZWFuOyAvLyBhbGxvdyBwcmVtb3ZlcyBmb3IgY29sb3IgdGhhdCBjYW4gbm90IG1vdmVcbiAgICBzaG93RGVzdHM6IGJvb2xlYW47IC8vIHdoZXRoZXIgdG8gYWRkIHRoZSBwcmVtb3ZlLWRlc3QgY2xhc3Mgb24gc3F1YXJlc1xuICAgIGNhc3RsZTogYm9vbGVhbjsgLy8gd2hldGhlciB0byBhbGxvdyBraW5nIGNhc3RsZSBwcmVtb3Zlc1xuICAgIGRlc3RzPzogY2cuS2V5W107IC8vIHByZW1vdmUgZGVzdGluYXRpb25zIGZvciB0aGUgY3VycmVudCBzZWxlY3Rpb25cbiAgICBjdXJyZW50PzogY2cuS2V5UGFpcjsgLy8ga2V5cyBvZiB0aGUgY3VycmVudCBzYXZlZCBwcmVtb3ZlIFtcImUyXCIgXCJlNFwiXVxuICAgIGV2ZW50czoge1xuICAgICAgc2V0PzogKG9yaWc6IGNnLktleSwgZGVzdDogY2cuS2V5LCBtZXRhZGF0YT86IGNnLlNldFByZW1vdmVNZXRhZGF0YSkgPT4gdm9pZDsgLy8gY2FsbGVkIGFmdGVyIHRoZSBwcmVtb3ZlIGhhcyBiZWVuIHNldFxuICAgICAgdW5zZXQ/OiAoKSA9PiB2b2lkOyAgLy8gY2FsbGVkIGFmdGVyIHRoZSBwcmVtb3ZlIGhhcyBiZWVuIHVuc2V0XG4gICAgfVxuICB9O1xuICBwcmVkcm9wcGFibGU6IHtcbiAgICBlbmFibGVkOiBib29sZWFuOyAvLyBhbGxvdyBwcmVkcm9wcyBmb3IgY29sb3IgdGhhdCBjYW4gbm90IG1vdmVcbiAgICBjdXJyZW50PzogeyAvLyBjdXJyZW50IHNhdmVkIHByZWRyb3Age3JvbGU6ICdrbmlnaHQnOyBrZXk6ICdlNCd9XG4gICAgICByb2xlOiBjZy5Sb2xlO1xuICAgICAga2V5OiBjZy5LZXlcbiAgICB9O1xuICAgIGV2ZW50czoge1xuICAgICAgc2V0PzogKHJvbGU6IGNnLlJvbGUsIGtleTogY2cuS2V5KSA9PiB2b2lkOyAvLyBjYWxsZWQgYWZ0ZXIgdGhlIHByZWRyb3AgaGFzIGJlZW4gc2V0XG4gICAgICB1bnNldD86ICgpID0+IHZvaWQ7IC8vIGNhbGxlZCBhZnRlciB0aGUgcHJlZHJvcCBoYXMgYmVlbiB1bnNldFxuICAgIH1cbiAgfTtcbiAgZHJhZ2dhYmxlOiB7XG4gICAgZW5hYmxlZDogYm9vbGVhbjsgLy8gYWxsb3cgbW92ZXMgJiBwcmVtb3ZlcyB0byB1c2UgZHJhZyduIGRyb3BcbiAgICBkaXN0YW5jZTogbnVtYmVyOyAvLyBtaW5pbXVtIGRpc3RhbmNlIHRvIGluaXRpYXRlIGEgZHJhZzsgaW4gcGl4ZWxzXG4gICAgYXV0b0Rpc3RhbmNlOiBib29sZWFuOyAvLyBsZXRzIGNoZXNzZ3JvdW5kIHNldCBkaXN0YW5jZSB0byB6ZXJvIHdoZW4gdXNlciBkcmFncyBwaWVjZXNcbiAgICBjZW50ZXJQaWVjZTogYm9vbGVhbjsgLy8gY2VudGVyIHRoZSBwaWVjZSBvbiBjdXJzb3IgYXQgZHJhZyBzdGFydFxuICAgIHNob3dHaG9zdDogYm9vbGVhbjsgLy8gc2hvdyBnaG9zdCBvZiBwaWVjZSBiZWluZyBkcmFnZ2VkXG4gICAgZGVsZXRlT25Ecm9wT2ZmOiBib29sZWFuOyAvLyBkZWxldGUgYSBwaWVjZSB3aGVuIGl0IGlzIGRyb3BwZWQgb2ZmIHRoZSBib2FyZFxuICAgIGN1cnJlbnQ/OiBEcmFnQ3VycmVudDtcbiAgfTtcbiAgZHJvcG1vZGU6IHtcbiAgICBhY3RpdmU6IGJvb2xlYW47XG4gICAgcGllY2U/OiBjZy5QaWVjZTtcbiAgfVxuICBzZWxlY3RhYmxlOiB7XG4gICAgLy8gZGlzYWJsZSB0byBlbmZvcmNlIGRyYWdnaW5nIG92ZXIgY2xpY2stY2xpY2sgbW92ZVxuICAgIGVuYWJsZWQ6IGJvb2xlYW5cbiAgfTtcbiAgc3RhdHM6IHtcbiAgICAvLyB3YXMgbGFzdCBwaWVjZSBkcmFnZ2VkIG9yIGNsaWNrZWQ/XG4gICAgLy8gbmVlZHMgZGVmYXVsdCB0byBmYWxzZSBmb3IgdG91Y2hcbiAgICBkcmFnZ2VkOiBib29sZWFuLFxuICAgIGN0cmxLZXk/OiBib29sZWFuXG4gIH07XG4gIGV2ZW50czoge1xuICAgIGNoYW5nZT86ICgpID0+IHZvaWQ7IC8vIGNhbGxlZCBhZnRlciB0aGUgc2l0dWF0aW9uIGNoYW5nZXMgb24gdGhlIGJvYXJkXG4gICAgLy8gY2FsbGVkIGFmdGVyIGEgcGllY2UgaGFzIGJlZW4gbW92ZWQuXG4gICAgLy8gY2FwdHVyZWRQaWVjZSBpcyB1bmRlZmluZWQgb3IgbGlrZSB7Y29sb3I6ICd3aGl0ZSc7ICdyb2xlJzogJ3F1ZWVuJ31cbiAgICBtb3ZlPzogKG9yaWc6IGNnLktleSwgZGVzdDogY2cuS2V5LCBjYXB0dXJlZFBpZWNlPzogY2cuUGllY2UpID0+IHZvaWQ7XG4gICAgZHJvcE5ld1BpZWNlPzogKHBpZWNlOiBjZy5QaWVjZSwga2V5OiBjZy5LZXkpID0+IHZvaWQ7XG4gICAgc2VsZWN0PzogKGtleTogY2cuS2V5KSA9PiB2b2lkIC8vIGNhbGxlZCB3aGVuIGEgc3F1YXJlIGlzIHNlbGVjdGVkXG4gICAgaW5zZXJ0PzogKGVsZW1lbnRzOiBjZy5FbGVtZW50cykgPT4gdm9pZDsgLy8gd2hlbiB0aGUgYm9hcmQgRE9NIGhhcyBiZWVuIChyZSlpbnNlcnRlZFxuICB9O1xuICBkcmF3YWJsZTogRHJhd2FibGUsXG4gIGV4cGxvZGluZz86IGNnLkV4cGxvZGluZztcbiAgZG9tOiBjZy5Eb20sXG4gIGhvbGQ6IGNnLlRpbWVyLFxuICBkaW1lbnNpb25zOiBjZy5Cb2FyZERpbWVuc2lvbnMsIC8vIG51bWJlciBvZiBsaW5lcyBhbmQgcmFua3Mgb2YgdGhlIGJvYXJkIHt3aWR0aDogMTAsIGhlaWdodDogOH1cbiAgZ2VvbWV0cnk6IGNnLkdlb21ldHJ5LCAvLyBkaW04eDggfCBkaW05eDkgfCBkaW0xMHg4IHwgZGltOXgxMFxufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdHMoKTogUGFydGlhbDxTdGF0ZT4ge1xuICByZXR1cm4ge1xuICAgIHBpZWNlczogZmVuLnJlYWQoZmVuLmluaXRpYWwsIGNnLkdlb21ldHJ5LmRpbTh4OCksXG4gICAgb3JpZW50YXRpb246ICd3aGl0ZScsXG4gICAgdHVybkNvbG9yOiAnd2hpdGUnLFxuICAgIGNvb3JkaW5hdGVzOiB0cnVlLFxuICAgIGF1dG9DYXN0bGU6IHRydWUsXG4gICAgdmlld09ubHk6IGZhbHNlLFxuICAgIGRpc2FibGVDb250ZXh0TWVudTogZmFsc2UsXG4gICAgcmVzaXphYmxlOiB0cnVlLFxuICAgIGFkZFBpZWNlWkluZGV4OiBmYWxzZSxcbiAgICBwaWVjZUtleTogZmFsc2UsXG4gICAgaGlnaGxpZ2h0OiB7XG4gICAgICBsYXN0TW92ZTogdHJ1ZSxcbiAgICAgIGNoZWNrOiB0cnVlXG4gICAgfSxcbiAgICBhbmltYXRpb246IHtcbiAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICBkdXJhdGlvbjogMjAwXG4gICAgfSxcbiAgICBtb3ZhYmxlOiB7XG4gICAgICBmcmVlOiB0cnVlLFxuICAgICAgY29sb3I6ICdib3RoJyxcbiAgICAgIHNob3dEZXN0czogdHJ1ZSxcbiAgICAgIGV2ZW50czoge30sXG4gICAgICByb29rQ2FzdGxlOiB0cnVlXG4gICAgfSxcbiAgICBwcmVtb3ZhYmxlOiB7XG4gICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgc2hvd0Rlc3RzOiB0cnVlLFxuICAgICAgY2FzdGxlOiB0cnVlLFxuICAgICAgZXZlbnRzOiB7fVxuICAgIH0sXG4gICAgcHJlZHJvcHBhYmxlOiB7XG4gICAgICBlbmFibGVkOiBmYWxzZSxcbiAgICAgIGV2ZW50czoge31cbiAgICB9LFxuICAgIGRyYWdnYWJsZToge1xuICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgIGRpc3RhbmNlOiAzLFxuICAgICAgYXV0b0Rpc3RhbmNlOiB0cnVlLFxuICAgICAgY2VudGVyUGllY2U6IHRydWUsXG4gICAgICBzaG93R2hvc3Q6IHRydWUsXG4gICAgICBkZWxldGVPbkRyb3BPZmY6IGZhbHNlXG4gICAgfSxcbiAgICBkcm9wbW9kZToge1xuICAgICAgYWN0aXZlOiBmYWxzZVxuICAgIH0sXG4gICAgc2VsZWN0YWJsZToge1xuICAgICAgZW5hYmxlZDogdHJ1ZVxuICAgIH0sXG4gICAgc3RhdHM6IHtcbiAgICAgIC8vIG9uIHRvdWNoc2NyZWVuLCBkZWZhdWx0IHRvIFwidGFwLXRhcFwiIG1vdmVzXG4gICAgICAvLyBpbnN0ZWFkIG9mIGRyYWdcbiAgICAgIGRyYWdnZWQ6ICEoJ29udG91Y2hzdGFydCcgaW4gd2luZG93KVxuICAgIH0sXG4gICAgZXZlbnRzOiB7fSxcbiAgICBkcmF3YWJsZToge1xuICAgICAgZW5hYmxlZDogdHJ1ZSwgLy8gY2FuIGRyYXdcbiAgICAgIHZpc2libGU6IHRydWUsIC8vIGNhbiB2aWV3XG4gICAgICBlcmFzZU9uQ2xpY2s6IHRydWUsXG4gICAgICBzaGFwZXM6IFtdLFxuICAgICAgYXV0b1NoYXBlczogW10sXG4gICAgICBicnVzaGVzOiB7XG4gICAgICAgIGdyZWVuOiB7IGtleTogJ2cnLCBjb2xvcjogJyMxNTc4MUInLCBvcGFjaXR5OiAxLCBsaW5lV2lkdGg6IDEwIH0sXG4gICAgICAgIHJlZDogeyBrZXk6ICdyJywgY29sb3I6ICcjODgyMDIwJywgb3BhY2l0eTogMSwgbGluZVdpZHRoOiAxMCB9LFxuICAgICAgICBibHVlOiB7IGtleTogJ2InLCBjb2xvcjogJyMwMDMwODgnLCBvcGFjaXR5OiAxLCBsaW5lV2lkdGg6IDEwIH0sXG4gICAgICAgIHllbGxvdzogeyBrZXk6ICd5JywgY29sb3I6ICcjZTY4ZjAwJywgb3BhY2l0eTogMSwgbGluZVdpZHRoOiAxMCB9LFxuICAgICAgICBwYWxlQmx1ZTogeyBrZXk6ICdwYicsIGNvbG9yOiAnIzAwMzA4OCcsIG9wYWNpdHk6IDAuNCwgbGluZVdpZHRoOiAxNSB9LFxuICAgICAgICBwYWxlR3JlZW46IHsga2V5OiAncGcnLCBjb2xvcjogJyMxNTc4MUInLCBvcGFjaXR5OiAwLjQsIGxpbmVXaWR0aDogMTUgfSxcbiAgICAgICAgcGFsZVJlZDogeyBrZXk6ICdwcicsIGNvbG9yOiAnIzg4MjAyMCcsIG9wYWNpdHk6IDAuNCwgbGluZVdpZHRoOiAxNSB9LFxuICAgICAgICBwYWxlR3JleTogeyBrZXk6ICdwZ3InLCBjb2xvcjogJyM0YTRhNGEnLCBvcGFjaXR5OiAwLjM1LCBsaW5lV2lkdGg6IDE1IH1cbiAgICAgIH0sXG4gICAgICBwaWVjZXM6IHtcbiAgICAgICAgYmFzZVVybDogJ2h0dHBzOi8vbGljaGVzczEub3JnL2Fzc2V0cy9waWVjZS9jYnVybmV0dC8nXG4gICAgICB9LFxuICAgICAgcHJldlN2Z0hhc2g6ICcnXG4gICAgfSxcbiAgICBob2xkOiB0aW1lcigpLFxuICAgIGRpbWVuc2lvbnM6IHt3aWR0aDogOCwgaGVpZ2h0OiA4fSxcbiAgICBnZW9tZXRyeTogY2cuR2VvbWV0cnkuZGltOHg4LFxuICB9O1xufVxuIiwiaW1wb3J0IHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJ1xuaW1wb3J0IHsga2V5MnBvcyB9IGZyb20gJy4vdXRpbCdcbmltcG9ydCB7IERyYXdhYmxlLCBEcmF3U2hhcGUsIERyYXdTaGFwZVBpZWNlLCBEcmF3QnJ1c2gsIERyYXdCcnVzaGVzLCBEcmF3TW9kaWZpZXJzIH0gZnJvbSAnLi9kcmF3J1xuaW1wb3J0ICogYXMgY2cgZnJvbSAnLi90eXBlcydcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQodGFnTmFtZTogc3RyaW5nKTogU1ZHRWxlbWVudCB7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgdGFnTmFtZSk7XG59XG5cbmludGVyZmFjZSBTaGFwZSB7XG4gIHNoYXBlOiBEcmF3U2hhcGU7XG4gIGN1cnJlbnQ6IGJvb2xlYW47XG4gIGhhc2g6IEhhc2g7XG59XG5cbmludGVyZmFjZSBDdXN0b21CcnVzaGVzIHtcbiAgW2hhc2g6IHN0cmluZ106IERyYXdCcnVzaFxufVxuXG5pbnRlcmZhY2UgQXJyb3dEZXN0cyB7XG4gIFtrZXk6IHN0cmluZ106IG51bWJlcjsgLy8gaG93IG1hbnkgYXJyb3dzIGxhbmQgb24gYSBzcXVhcmVcbn1cblxudHlwZSBIYXNoID0gc3RyaW5nO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyU3ZnKHN0YXRlOiBTdGF0ZSwgcm9vdDogU1ZHRWxlbWVudCk6IHZvaWQge1xuXG4gIGNvbnN0IGQgPSBzdGF0ZS5kcmF3YWJsZSxcbiAgY3VyRCA9IGQuY3VycmVudCxcbiAgY3VyID0gY3VyRCAmJiBjdXJELm1vdXNlU3EgPyBjdXJEIGFzIERyYXdTaGFwZSA6IHVuZGVmaW5lZCxcbiAgYXJyb3dEZXN0czogQXJyb3dEZXN0cyA9IHt9O1xuXG4gIGQuc2hhcGVzLmNvbmNhdChkLmF1dG9TaGFwZXMpLmNvbmNhdChjdXIgPyBbY3VyXSA6IFtdKS5mb3JFYWNoKHMgPT4ge1xuICAgIGlmIChzLmRlc3QpIGFycm93RGVzdHNbcy5kZXN0XSA9IChhcnJvd0Rlc3RzW3MuZGVzdF0gfHwgMCkgKyAxO1xuICB9KTtcblxuICBjb25zdCBzaGFwZXM6IFNoYXBlW10gPSBkLnNoYXBlcy5jb25jYXQoZC5hdXRvU2hhcGVzKS5tYXAoKHM6IERyYXdTaGFwZSkgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICBzaGFwZTogcyxcbiAgICAgIGN1cnJlbnQ6IGZhbHNlLFxuICAgICAgaGFzaDogc2hhcGVIYXNoKHMsIGFycm93RGVzdHMsIGZhbHNlKVxuICAgIH07XG4gIH0pO1xuICBpZiAoY3VyKSBzaGFwZXMucHVzaCh7XG4gICAgc2hhcGU6IGN1cixcbiAgICBjdXJyZW50OiB0cnVlLFxuICAgIGhhc2g6IHNoYXBlSGFzaChjdXIsIGFycm93RGVzdHMsIHRydWUpXG4gIH0pO1xuXG4gIGNvbnN0IGZ1bGxIYXNoID0gc2hhcGVzLm1hcChzYyA9PiBzYy5oYXNoKS5qb2luKCcnKTtcbiAgaWYgKGZ1bGxIYXNoID09PSBzdGF0ZS5kcmF3YWJsZS5wcmV2U3ZnSGFzaCkgcmV0dXJuO1xuICBzdGF0ZS5kcmF3YWJsZS5wcmV2U3ZnSGFzaCA9IGZ1bGxIYXNoO1xuXG4gIGNvbnN0IGRlZnNFbCA9IHJvb3QuZmlyc3RDaGlsZCBhcyBTVkdFbGVtZW50O1xuXG4gIHN5bmNEZWZzKGQsIHNoYXBlcywgZGVmc0VsKTtcbiAgc3luY1NoYXBlcyhzdGF0ZSwgc2hhcGVzLCBkLmJydXNoZXMsIGFycm93RGVzdHMsIHJvb3QsIGRlZnNFbCk7XG59XG5cbi8vIGFwcGVuZCBvbmx5LiBEb24ndCB0cnkgdG8gdXBkYXRlL3JlbW92ZS5cbmZ1bmN0aW9uIHN5bmNEZWZzKGQ6IERyYXdhYmxlLCBzaGFwZXM6IFNoYXBlW10sIGRlZnNFbDogU1ZHRWxlbWVudCkge1xuICBjb25zdCBicnVzaGVzOiBDdXN0b21CcnVzaGVzID0ge307XG4gIGxldCBicnVzaDogRHJhd0JydXNoO1xuICBzaGFwZXMuZm9yRWFjaChzID0+IHtcbiAgICBpZiAocy5zaGFwZS5kZXN0KSB7XG4gICAgICBicnVzaCA9IGQuYnJ1c2hlc1tzLnNoYXBlLmJydXNoXTtcbiAgICAgIGlmIChzLnNoYXBlLm1vZGlmaWVycykgYnJ1c2ggPSBtYWtlQ3VzdG9tQnJ1c2goYnJ1c2gsIHMuc2hhcGUubW9kaWZpZXJzKTtcbiAgICAgIGJydXNoZXNbYnJ1c2gua2V5XSA9IGJydXNoO1xuICAgIH1cbiAgfSk7XG4gIGNvbnN0IGtleXNJbkRvbToge1trZXk6IHN0cmluZ106IGJvb2xlYW59ID0ge307XG4gIGxldCBlbDogU1ZHRWxlbWVudCA9IGRlZnNFbC5maXJzdENoaWxkIGFzIFNWR0VsZW1lbnQ7XG4gIHdoaWxlKGVsKSB7XG4gICAga2V5c0luRG9tW2VsLmdldEF0dHJpYnV0ZSgnY2dLZXknKSBhcyBzdHJpbmddID0gdHJ1ZTtcbiAgICBlbCA9IGVsLm5leHRTaWJsaW5nIGFzIFNWR0VsZW1lbnQ7XG4gIH1cbiAgZm9yIChsZXQga2V5IGluIGJydXNoZXMpIHtcbiAgICBpZiAoIWtleXNJbkRvbVtrZXldKSBkZWZzRWwuYXBwZW5kQ2hpbGQocmVuZGVyTWFya2VyKGJydXNoZXNba2V5XSkpO1xuICB9XG59XG5cbi8vIGFwcGVuZCBhbmQgcmVtb3ZlIG9ubHkuIE5vIHVwZGF0ZXMuXG5mdW5jdGlvbiBzeW5jU2hhcGVzKHN0YXRlOiBTdGF0ZSwgc2hhcGVzOiBTaGFwZVtdLCBicnVzaGVzOiBEcmF3QnJ1c2hlcywgYXJyb3dEZXN0czogQXJyb3dEZXN0cywgcm9vdDogU1ZHRWxlbWVudCwgZGVmc0VsOiBTVkdFbGVtZW50KTogdm9pZCB7XG4gIGNvbnN0IGJvdW5kcyA9IHN0YXRlLmRvbS5ib3VuZHMoKSxcbiAgaGFzaGVzSW5Eb206IHtbaGFzaDogc3RyaW5nXTogYm9vbGVhbn0gPSB7fSxcbiAgdG9SZW1vdmU6IFNWR0VsZW1lbnRbXSA9IFtdO1xuICBzaGFwZXMuZm9yRWFjaChzYyA9PiB7IGhhc2hlc0luRG9tW3NjLmhhc2hdID0gZmFsc2U7IH0pO1xuICBsZXQgZWw6IFNWR0VsZW1lbnQgPSBkZWZzRWwubmV4dFNpYmxpbmcgYXMgU1ZHRWxlbWVudCwgZWxIYXNoOiBIYXNoO1xuICB3aGlsZShlbCkge1xuICAgIGVsSGFzaCA9IGVsLmdldEF0dHJpYnV0ZSgnY2dIYXNoJykgYXMgSGFzaDtcbiAgICAvLyBmb3VuZCBhIHNoYXBlIGVsZW1lbnQgdGhhdCdzIGhlcmUgdG8gc3RheVxuICAgIGlmIChoYXNoZXNJbkRvbS5oYXNPd25Qcm9wZXJ0eShlbEhhc2gpKSBoYXNoZXNJbkRvbVtlbEhhc2hdID0gdHJ1ZTtcbiAgICAvLyBvciByZW1vdmUgaXRcbiAgICBlbHNlIHRvUmVtb3ZlLnB1c2goZWwpO1xuICAgIGVsID0gZWwubmV4dFNpYmxpbmcgYXMgU1ZHRWxlbWVudDtcbiAgfVxuICAvLyByZW1vdmUgb2xkIHNoYXBlc1xuICB0b1JlbW92ZS5mb3JFYWNoKGVsID0+IHJvb3QucmVtb3ZlQ2hpbGQoZWwpKTtcbiAgLy8gaW5zZXJ0IHNoYXBlcyB0aGF0IGFyZSBub3QgeWV0IGluIGRvbVxuICBzaGFwZXMuZm9yRWFjaChzYyA9PiB7XG4gICAgaWYgKCFoYXNoZXNJbkRvbVtzYy5oYXNoXSkgcm9vdC5hcHBlbmRDaGlsZChyZW5kZXJTaGFwZShzdGF0ZSwgc2MsIGJydXNoZXMsIGFycm93RGVzdHMsIGJvdW5kcykpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gc2hhcGVIYXNoKHtvcmlnLCBkZXN0LCBicnVzaCwgcGllY2UsIG1vZGlmaWVyc306IERyYXdTaGFwZSwgYXJyb3dEZXN0czogQXJyb3dEZXN0cywgY3VycmVudDogYm9vbGVhbik6IEhhc2gge1xuICByZXR1cm4gW2N1cnJlbnQsIG9yaWcsIGRlc3QsIGJydXNoLCBkZXN0ICYmIGFycm93RGVzdHNbZGVzdF0gPiAxLFxuICAgIHBpZWNlICYmIHBpZWNlSGFzaChwaWVjZSksXG4gICAgbW9kaWZpZXJzICYmIG1vZGlmaWVyc0hhc2gobW9kaWZpZXJzKVxuICBdLmZpbHRlcih4ID0+IHgpLmpvaW4oJycpO1xufVxuXG5mdW5jdGlvbiBwaWVjZUhhc2gocGllY2U6IERyYXdTaGFwZVBpZWNlKTogSGFzaCB7XG4gIHJldHVybiBbcGllY2UuY29sb3IsIHBpZWNlLnJvbGUsIHBpZWNlLnNjYWxlXS5maWx0ZXIoeCA9PiB4KS5qb2luKCcnKTtcbn1cblxuZnVuY3Rpb24gbW9kaWZpZXJzSGFzaChtOiBEcmF3TW9kaWZpZXJzKTogSGFzaCB7XG4gIHJldHVybiAnJyArIChtLmxpbmVXaWR0aCB8fCAnJyk7XG59XG5cbmZ1bmN0aW9uIHJlbmRlclNoYXBlKHN0YXRlOiBTdGF0ZSwge3NoYXBlLCBjdXJyZW50LCBoYXNofTogU2hhcGUsIGJydXNoZXM6IERyYXdCcnVzaGVzLCBhcnJvd0Rlc3RzOiBBcnJvd0Rlc3RzLCBib3VuZHM6IENsaWVudFJlY3QpOiBTVkdFbGVtZW50IHtcbiAgY29uc3QgZmlyc3RSYW5rSXMwID0gc3RhdGUuZGltZW5zaW9ucy5oZWlnaHQgPT09IDEwO1xuICBsZXQgZWw6IFNWR0VsZW1lbnQ7XG4gIGlmIChzaGFwZS5waWVjZSkgZWwgPSByZW5kZXJQaWVjZShcbiAgICBzdGF0ZS5kcmF3YWJsZS5waWVjZXMuYmFzZVVybCxcbiAgICBvcmllbnQoa2V5MnBvcyhzaGFwZS5vcmlnLCBmaXJzdFJhbmtJczApLCBzdGF0ZS5vcmllbnRhdGlvbiwgc3RhdGUuZGltZW5zaW9ucyksXG4gICAgc2hhcGUucGllY2UsXG4gICAgYm91bmRzLFxuICAgIHN0YXRlLmRpbWVuc2lvbnMpO1xuICBlbHNlIHtcbiAgICBjb25zdCBvcmlnID0gb3JpZW50KGtleTJwb3Moc2hhcGUub3JpZywgZmlyc3RSYW5rSXMwKSwgc3RhdGUub3JpZW50YXRpb24sIHN0YXRlLmRpbWVuc2lvbnMpO1xuICAgIGlmIChzaGFwZS5vcmlnICYmIHNoYXBlLmRlc3QpIHtcbiAgICAgIGxldCBicnVzaDogRHJhd0JydXNoID0gYnJ1c2hlc1tzaGFwZS5icnVzaF07XG4gICAgICBpZiAoc2hhcGUubW9kaWZpZXJzKSBicnVzaCA9IG1ha2VDdXN0b21CcnVzaChicnVzaCwgc2hhcGUubW9kaWZpZXJzKTtcbiAgICAgIGVsID0gcmVuZGVyQXJyb3coXG4gICAgICAgIGJydXNoLFxuICAgICAgICBvcmlnLFxuICAgICAgICBvcmllbnQoa2V5MnBvcyhzaGFwZS5kZXN0LCBmaXJzdFJhbmtJczApLCBzdGF0ZS5vcmllbnRhdGlvbiwgc3RhdGUuZGltZW5zaW9ucyksXG4gICAgICAgIGN1cnJlbnQsXG4gICAgICAgIGFycm93RGVzdHNbc2hhcGUuZGVzdF0gPiAxLFxuICAgICAgICBib3VuZHMsXG4gICAgICAgIHN0YXRlLmRpbWVuc2lvbnMpO1xuICAgIH1cbiAgICBlbHNlIGVsID0gcmVuZGVyQ2lyY2xlKGJydXNoZXNbc2hhcGUuYnJ1c2hdLCBvcmlnLCBjdXJyZW50LCBib3VuZHMsIHN0YXRlLmRpbWVuc2lvbnMpO1xuICB9XG4gIGVsLnNldEF0dHJpYnV0ZSgnY2dIYXNoJywgaGFzaCk7XG4gIHJldHVybiBlbDtcbn1cblxuZnVuY3Rpb24gcmVuZGVyQ2lyY2xlKGJydXNoOiBEcmF3QnJ1c2gsIHBvczogY2cuUG9zLCBjdXJyZW50OiBib29sZWFuLCBib3VuZHM6IENsaWVudFJlY3QsIGJkOiBjZy5Cb2FyZERpbWVuc2lvbnMpOiBTVkdFbGVtZW50IHtcbiAgY29uc3QgbyA9IHBvczJweChwb3MsIGJvdW5kcywgYmQpLFxuICB3aWR0aHMgPSBjaXJjbGVXaWR0aChib3VuZHMsIGJkKSxcbiAgcmFkaXVzID0gKGJvdW5kcy53aWR0aCAvIGJkLndpZHRoKSAvIDI7XG4gIHJldHVybiBzZXRBdHRyaWJ1dGVzKGNyZWF0ZUVsZW1lbnQoJ2NpcmNsZScpLCB7XG4gICAgc3Ryb2tlOiBicnVzaC5jb2xvcixcbiAgICAnc3Ryb2tlLXdpZHRoJzogd2lkdGhzW2N1cnJlbnQgPyAwIDogMV0sXG4gICAgZmlsbDogJ25vbmUnLFxuICAgIG9wYWNpdHk6IG9wYWNpdHkoYnJ1c2gsIGN1cnJlbnQpLFxuICAgIGN4OiBvWzBdLFxuICAgIGN5OiBvWzFdLFxuICAgIHI6IHJhZGl1cyAtIHdpZHRoc1sxXSAvIDJcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJlbmRlckFycm93KGJydXNoOiBEcmF3QnJ1c2gsIG9yaWc6IGNnLlBvcywgZGVzdDogY2cuUG9zLCBjdXJyZW50OiBib29sZWFuLCBzaG9ydGVuOiBib29sZWFuLCBib3VuZHM6IENsaWVudFJlY3QsIGJkOiBjZy5Cb2FyZERpbWVuc2lvbnMpOiBTVkdFbGVtZW50IHtcbiAgY29uc3QgbSA9IGFycm93TWFyZ2luKGJvdW5kcywgc2hvcnRlbiAmJiAhY3VycmVudCwgYmQpLFxuICBhID0gcG9zMnB4KG9yaWcsIGJvdW5kcywgYmQpLFxuICBiID0gcG9zMnB4KGRlc3QsIGJvdW5kcywgYmQpLFxuICBkeCA9IGJbMF0gLSBhWzBdLFxuICBkeSA9IGJbMV0gLSBhWzFdLFxuICBhbmdsZSA9IE1hdGguYXRhbjIoZHksIGR4KSxcbiAgeG8gPSBNYXRoLmNvcyhhbmdsZSkgKiBtLFxuICB5byA9IE1hdGguc2luKGFuZ2xlKSAqIG07XG4gIHJldHVybiBzZXRBdHRyaWJ1dGVzKGNyZWF0ZUVsZW1lbnQoJ2xpbmUnKSwge1xuICAgIHN0cm9rZTogYnJ1c2guY29sb3IsXG4gICAgJ3N0cm9rZS13aWR0aCc6IGxpbmVXaWR0aChicnVzaCwgY3VycmVudCwgYm91bmRzLCBiZCksXG4gICAgJ3N0cm9rZS1saW5lY2FwJzogJ3JvdW5kJyxcbiAgICAnbWFya2VyLWVuZCc6ICd1cmwoI2Fycm93aGVhZC0nICsgYnJ1c2gua2V5ICsgJyknLFxuICAgIG9wYWNpdHk6IG9wYWNpdHkoYnJ1c2gsIGN1cnJlbnQpLFxuICAgIHgxOiBhWzBdLFxuICAgIHkxOiBhWzFdLFxuICAgIHgyOiBiWzBdIC0geG8sXG4gICAgeTI6IGJbMV0gLSB5b1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyUGllY2UoYmFzZVVybDogc3RyaW5nLCBwb3M6IGNnLlBvcywgcGllY2U6IERyYXdTaGFwZVBpZWNlLCBib3VuZHM6IENsaWVudFJlY3QsIGJkOiBjZy5Cb2FyZERpbWVuc2lvbnMpOiBTVkdFbGVtZW50IHtcbiAgY29uc3QgbyA9IHBvczJweChwb3MsIGJvdW5kcywgYmQpLFxuICB3aWR0aCA9IGJvdW5kcy53aWR0aCAvIGJkLndpZHRoICogKHBpZWNlLnNjYWxlIHx8IDEpLFxuICBoZWlnaHQgPSBib3VuZHMud2lkdGggLyBiZC5oZWlnaHQgKiAocGllY2Uuc2NhbGUgfHwgMSksXG4gIG5hbWUgPSBwaWVjZS5jb2xvclswXSArIChwaWVjZS5yb2xlID09PSAna25pZ2h0JyA/ICduJyA6IHBpZWNlLnJvbGVbMF0pLnRvVXBwZXJDYXNlKCk7XG4gIHJldHVybiBzZXRBdHRyaWJ1dGVzKGNyZWF0ZUVsZW1lbnQoJ2ltYWdlJyksIHtcbiAgICBjbGFzc05hbWU6IGAke3BpZWNlLnJvbGV9ICR7cGllY2UuY29sb3J9YCxcbiAgICB4OiBvWzBdIC0gd2lkdGggLyAyLFxuICAgIHk6IG9bMV0gLSBoZWlnaHQgLyAyLFxuICAgIHdpZHRoOiB3aWR0aCxcbiAgICBoZWlnaHQ6IGhlaWdodCxcbiAgICBocmVmOiBiYXNlVXJsICsgbmFtZSArICcuc3ZnJ1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyTWFya2VyKGJydXNoOiBEcmF3QnJ1c2gpOiBTVkdFbGVtZW50IHtcbiAgY29uc3QgbWFya2VyID0gc2V0QXR0cmlidXRlcyhjcmVhdGVFbGVtZW50KCdtYXJrZXInKSwge1xuICAgIGlkOiAnYXJyb3doZWFkLScgKyBicnVzaC5rZXksXG4gICAgb3JpZW50OiAnYXV0bycsXG4gICAgbWFya2VyV2lkdGg6IDQsXG4gICAgbWFya2VySGVpZ2h0OiA4LFxuICAgIHJlZlg6IDIuMDUsXG4gICAgcmVmWTogMi4wMVxuICB9KTtcbiAgbWFya2VyLmFwcGVuZENoaWxkKHNldEF0dHJpYnV0ZXMoY3JlYXRlRWxlbWVudCgncGF0aCcpLCB7XG4gICAgZDogJ00wLDAgVjQgTDMsMiBaJyxcbiAgICBmaWxsOiBicnVzaC5jb2xvclxuICB9KSk7XG4gIG1hcmtlci5zZXRBdHRyaWJ1dGUoJ2NnS2V5JywgYnJ1c2gua2V5KTtcbiAgcmV0dXJuIG1hcmtlcjtcbn1cblxuZnVuY3Rpb24gc2V0QXR0cmlidXRlcyhlbDogU1ZHRWxlbWVudCwgYXR0cnM6IHsgW2tleTogc3RyaW5nXTogYW55IH0pOiBTVkdFbGVtZW50IHtcbiAgZm9yIChsZXQga2V5IGluIGF0dHJzKSBlbC5zZXRBdHRyaWJ1dGUoa2V5LCBhdHRyc1trZXldKTtcbiAgcmV0dXJuIGVsO1xufVxuXG5mdW5jdGlvbiBvcmllbnQocG9zOiBjZy5Qb3MsIGNvbG9yOiBjZy5Db2xvciwgYmQ6IGNnLkJvYXJkRGltZW5zaW9ucyk6IGNnLlBvcyB7XG4gIHJldHVybiBjb2xvciA9PT0gJ3doaXRlJyA/IHBvcyA6IFtiZC53aWR0aCArIDEgLSBwb3NbMF0sIGJkLmhlaWdodCArIDEgLSBwb3NbMV1dO1xufVxuXG5mdW5jdGlvbiBtYWtlQ3VzdG9tQnJ1c2goYmFzZTogRHJhd0JydXNoLCBtb2RpZmllcnM6IERyYXdNb2RpZmllcnMpOiBEcmF3QnJ1c2gge1xuICBjb25zdCBicnVzaDogUGFydGlhbDxEcmF3QnJ1c2g+ID0ge1xuICAgIGNvbG9yOiBiYXNlLmNvbG9yLFxuICAgIG9wYWNpdHk6IE1hdGgucm91bmQoYmFzZS5vcGFjaXR5ICogMTApIC8gMTAsXG4gICAgbGluZVdpZHRoOiBNYXRoLnJvdW5kKG1vZGlmaWVycy5saW5lV2lkdGggfHwgYmFzZS5saW5lV2lkdGgpXG4gIH07XG4gIGJydXNoLmtleSA9IFtiYXNlLmtleSwgbW9kaWZpZXJzLmxpbmVXaWR0aF0uZmlsdGVyKHggPT4geCkuam9pbignJyk7XG4gIHJldHVybiBicnVzaCBhcyBEcmF3QnJ1c2g7XG59XG5cbmZ1bmN0aW9uIGNpcmNsZVdpZHRoKGJvdW5kczogQ2xpZW50UmVjdCwgYmQ6IGNnLkJvYXJkRGltZW5zaW9ucyk6IFtudW1iZXIsIG51bWJlcl0ge1xuICBjb25zdCBiYXNlID0gYm91bmRzLndpZHRoIC8gKGJkLndpZHRoICogNjQpO1xuICByZXR1cm4gWzMgKiBiYXNlLCA0ICogYmFzZV07XG59XG5cbmZ1bmN0aW9uIGxpbmVXaWR0aChicnVzaDogRHJhd0JydXNoLCBjdXJyZW50OiBib29sZWFuLCBib3VuZHM6IENsaWVudFJlY3QsIGJkOiBjZy5Cb2FyZERpbWVuc2lvbnMpOiBudW1iZXIge1xuICByZXR1cm4gKGJydXNoLmxpbmVXaWR0aCB8fCAxMCkgKiAoY3VycmVudCA/IDAuODUgOiAxKSAvIChiZC53aWR0aCAqIDY0KSAqIGJvdW5kcy53aWR0aDtcbn1cblxuZnVuY3Rpb24gb3BhY2l0eShicnVzaDogRHJhd0JydXNoLCBjdXJyZW50OiBib29sZWFuKTogbnVtYmVyIHtcbiAgcmV0dXJuIChicnVzaC5vcGFjaXR5IHx8IDEpICogKGN1cnJlbnQgPyAwLjkgOiAxKTtcbn1cblxuZnVuY3Rpb24gYXJyb3dNYXJnaW4oYm91bmRzOiBDbGllbnRSZWN0LCBzaG9ydGVuOiBib29sZWFuLCBiZDogY2cuQm9hcmREaW1lbnNpb25zKTogbnVtYmVyIHtcbiAgcmV0dXJuIChzaG9ydGVuID8gMjAgOiAxMCkgLyAoYmQud2lkdGggKiA2NCkgKiBib3VuZHMud2lkdGg7XG59XG5cbmZ1bmN0aW9uIHBvczJweChwb3M6IGNnLlBvcywgYm91bmRzOiBDbGllbnRSZWN0LCBiZDogY2cuQm9hcmREaW1lbnNpb25zKTogY2cuTnVtYmVyUGFpciB7XG4gIHJldHVybiBbKHBvc1swXSAtIDAuNSkgKiBib3VuZHMud2lkdGggLyBiZC53aWR0aCwgKGJkLmhlaWdodCArIDAuNSAtIHBvc1sxXSkgKiBib3VuZHMuaGVpZ2h0IC8gYmQuaGVpZ2h0XTtcbn1cbiIsImV4cG9ydCB0eXBlIENvbG9yID0gJ3doaXRlJyB8ICdibGFjayc7XG5leHBvcnQgdHlwZSBSb2xlID0gJ2tpbmcnIHwgJ3F1ZWVuJyB8ICdyb29rJyB8ICdiaXNob3AnIHwgJ2tuaWdodCcgfCAncGF3bicgfCAnY2FuY2VsbG9yJyB8ICdhcmNoYmlzaG9wJyB8ICdmZXJ6JyB8ICdtZXQnIHwgJ2dvbGQnIHwgJ3NpbHZlcicgfCAnbGFuY2UnfCAncHBhd24nIHwgJ3BrbmlnaHQnIHwgJ3BiaXNob3AnIHwgJ3Byb29rJyB8ICdwc2lsdmVyJyB8ICdwbGFuY2UnIHwgJ2Fkdmlzb3InIHwgJ2Nhbm5vbicgfCAnaGF3aycgfCAnZWxlcGhhbnQnO1xuZXhwb3J0IHR5cGUgS2V5ID0gICd6MCcgfCAnYTAnIHwgJ2IwJyB8ICdjMCcgfCAnZDAnIHwgJ2UwJyB8ICdmMCcgfCAnZzAnIHwgJ2gwJyB8ICdpMCcgfCAnajAnIHwgJ2ExJyB8ICdiMScgfCAnYzEnIHwgJ2QxJyB8ICdlMScgfCAnZjEnIHwgJ2cxJyB8ICdoMScgfCAnaTEnIHwgJ2oxJyB8ICdhMicgfCAnYjInIHwgJ2MyJyB8ICdkMicgfCAnZTInIHwgJ2YyJyB8ICdnMicgfCAnaDInIHwgJ2kyJyB8ICdqMicgfCAnYTMnIHwgJ2IzJyB8ICdjMycgfCAnZDMnIHwgJ2UzJyB8ICdmMycgfCAnZzMnIHwgJ2gzJyB8ICdpMycgfCAnajMnIHwgJ2E0JyB8ICdiNCcgfCAnYzQnIHwgJ2Q0JyB8ICdlNCcgfCAnZjQnIHwgJ2c0JyB8ICdoNCcgfCAnaTQnIHwgJ2o0JyB8ICdhNScgfCAnYjUnIHwgJ2M1JyB8ICdkNScgfCAnZTUnIHwgJ2Y1JyB8ICdnNScgfCAnaDUnIHwgJ2k1JyB8ICdqNScgfCAnYTYnIHwgJ2I2JyB8ICdjNicgfCAnZDYnIHwgJ2U2JyB8ICdmNicgfCAnZzYnIHwgJ2g2JyB8ICdpNicgfCAnajYnIHwgJ2E3JyB8ICdiNycgfCAnYzcnIHwgJ2Q3JyB8ICdlNycgfCAnZjcnIHwgJ2c3JyB8ICdoNycgfCAnaTcnIHwgJ2o3JyB8ICdhOCcgfCAnYjgnIHwgJ2M4JyB8ICdkOCcgfCAnZTgnIHwgJ2Y4JyB8ICdnOCcgfCAnaDgnIHwgJ2k4JyB8ICdqOCcgfCAnYTknIHwgJ2I5JyB8ICdjOScgfCAnZDknIHwgJ2U5JyB8ICdmOScgfCAnZzknIHwgJ2g5JyB8ICdpOScgfCAnajknO1xuZXhwb3J0IHR5cGUgRmlsZSA9ICdhJyB8ICdiJyB8ICdjJyB8ICdkJyB8ICdlJyB8ICdmJyB8ICdnJyB8ICdoJyB8ICdpJyB8ICdqJztcbmV4cG9ydCB0eXBlIFJhbmsgPSAnMCcgfCAnMScgfCAnMicgfCAnMycgfCAnNCcgfCAnNScgfCAnNicgfCAnNycgfCAnOCcgfCAnOScgfCAnMTAnO1xuZXhwb3J0IHR5cGUgRkVOID0gc3RyaW5nO1xuZXhwb3J0IHR5cGUgUG9zID0gW251bWJlciwgbnVtYmVyXTtcbmV4cG9ydCBpbnRlcmZhY2UgUGllY2Uge1xuICByb2xlOiBSb2xlO1xuICBjb2xvcjogQ29sb3I7XG4gIHByb21vdGVkPzogYm9vbGVhbjtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgRHJvcCB7XG4gIHJvbGU6IFJvbGU7XG4gIGtleTogS2V5O1xufVxuZXhwb3J0IGludGVyZmFjZSBQaWVjZXMge1xuICBba2V5OiBzdHJpbmddOiBQaWVjZSB8IHVuZGVmaW5lZDtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgUGllY2VzRGlmZiB7XG4gIFtrZXk6IHN0cmluZ106IFBpZWNlIHwgdW5kZWZpbmVkO1xufVxuXG5leHBvcnQgdHlwZSBLZXlQYWlyID0gW0tleSwgS2V5XTtcblxuZXhwb3J0IHR5cGUgTnVtYmVyUGFpciA9IFtudW1iZXIsIG51bWJlcl07XG5cbmV4cG9ydCB0eXBlIE51bWJlclF1YWQgPSBbbnVtYmVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyXTtcblxuZXhwb3J0IGludGVyZmFjZSBEZXN0cyB7XG4gIFtrZXk6IHN0cmluZ106IEtleVtdXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRWxlbWVudHMge1xuICBib2FyZDogSFRNTEVsZW1lbnQ7XG4gIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQ7XG4gIGdob3N0PzogSFRNTEVsZW1lbnQ7XG4gIHN2Zz86IFNWR0VsZW1lbnQ7XG59XG5leHBvcnQgaW50ZXJmYWNlIERvbSB7XG4gIGVsZW1lbnRzOiBFbGVtZW50cyxcbiAgYm91bmRzOiBNZW1vPENsaWVudFJlY3Q+O1xuICByZWRyYXc6ICgpID0+IHZvaWQ7XG4gIHJlZHJhd05vdzogKHNraXBTdmc/OiBib29sZWFuKSA9PiB2b2lkO1xuICB1bmJpbmQ/OiBVbmJpbmQ7XG4gIGRlc3Ryb3llZD86IGJvb2xlYW47XG4gIHJlbGF0aXZlPzogYm9vbGVhbjsgLy8gZG9uJ3QgY29tcHV0ZSBib3VuZHMsIHVzZSByZWxhdGl2ZSAlIHRvIHBsYWNlIHBpZWNlc1xufVxuZXhwb3J0IGludGVyZmFjZSBFeHBsb2Rpbmcge1xuICBzdGFnZTogbnVtYmVyO1xuICBrZXlzOiBLZXlbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNb3ZlTWV0YWRhdGEge1xuICBwcmVtb3ZlOiBib29sZWFuO1xuICBjdHJsS2V5PzogYm9vbGVhbjtcbiAgaG9sZFRpbWU/OiBudW1iZXI7XG4gIGNhcHR1cmVkPzogUGllY2U7XG4gIHByZWRyb3A/OiBib29sZWFuO1xufVxuZXhwb3J0IGludGVyZmFjZSBTZXRQcmVtb3ZlTWV0YWRhdGEge1xuICBjdHJsS2V5PzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IHR5cGUgV2luZG93RXZlbnQgPSAnb25zY3JvbGwnIHwgJ29ucmVzaXplJztcblxuZXhwb3J0IHR5cGUgTW91Y2hFdmVudCA9IE1vdXNlRXZlbnQgJiBUb3VjaEV2ZW50O1xuXG5leHBvcnQgaW50ZXJmYWNlIEtleWVkTm9kZSBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgY2dLZXk6IEtleTtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgUGllY2VOb2RlIGV4dGVuZHMgS2V5ZWROb2RlIHtcbiAgY2dQaWVjZTogc3RyaW5nO1xuICBjZ0FuaW1hdGluZz86IGJvb2xlYW47XG4gIGNnRmFkaW5nPzogYm9vbGVhbjtcbiAgY2dEcmFnZ2luZz86IGJvb2xlYW47XG59XG5leHBvcnQgaW50ZXJmYWNlIFNxdWFyZU5vZGUgZXh0ZW5kcyBLZXllZE5vZGUgeyB9XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWVtbzxBPiB7ICgpOiBBOyBjbGVhcjogKCkgPT4gdm9pZDsgfVxuXG5leHBvcnQgaW50ZXJmYWNlIFRpbWVyIHtcbiAgc3RhcnQ6ICgpID0+IHZvaWQ7XG4gIGNhbmNlbDogKCkgPT4gdm9pZDtcbiAgc3RvcDogKCkgPT4gbnVtYmVyO1xufVxuXG5leHBvcnQgdHlwZSBSZWRyYXcgPSAoKSA9PiB2b2lkO1xuZXhwb3J0IHR5cGUgVW5iaW5kID0gKCkgPT4gdm9pZDtcbmV4cG9ydCB0eXBlIE1pbGxpc2Vjb25kcyA9IG51bWJlcjtcbmV4cG9ydCB0eXBlIEtIeiA9IG51bWJlcjtcblxuZXhwb3J0IGNvbnN0IGZpbGVzOiBGaWxlW10gPSBbJ2EnLCAnYicsICdjJywgJ2QnLCAnZScsICdmJywgJ2cnLCAnaCcsICdpJywgJ2onXTtcbmV4cG9ydCBjb25zdCByYW5rczogUmFua1tdID0gWycwJywgJzEnLCAnMicsICczJywgJzQnLCAnNScsICc2JywgJzcnLCAnOCcsICc5JywgJzEwJ107XG5cbmV4cG9ydCBpbnRlcmZhY2UgQm9hcmREaW1lbnNpb25zIHtcbiAgd2lkdGg6IG51bWJlcjtcbiAgaGVpZ2h0OiBudW1iZXI7XG59XG5cbmV4cG9ydCBjb25zdCBlbnVtIEdlb21ldHJ5IHtkaW04eDgsIGRpbTl4OSwgZGltMTB4OCwgZGltOXgxMCwgZGltMTB4MTB9O1xuXG5leHBvcnQgY29uc3QgZGltZW5zaW9uczogQm9hcmREaW1lbnNpb25zW10gPSBbe3dpZHRoOiA4LCBoZWlnaHQ6IDh9LCB7d2lkdGg6IDksIGhlaWdodDogOX0sIHt3aWR0aDogMTAsIGhlaWdodDogOH0sIHt3aWR0aDogOSwgaGVpZ2h0OiAxMH0sIHt3aWR0aDogMTAsIGhlaWdodDogMTB9XTtcbiIsImltcG9ydCAqIGFzIGNnIGZyb20gJy4vdHlwZXMnO1xuXG5leHBvcnQgY29uc3QgY29sb3JzOiBjZy5Db2xvcltdID0gWyd3aGl0ZScsICdibGFjayddO1xuXG5leHBvcnQgY29uc3QgTlJhbmtzOiBudW1iZXJbXSA9IFsxLCAyLCAzLCA0LCA1LCA2LCA3LCA4LCA5LCAxMF07XG5leHBvcnQgY29uc3QgaW52TlJhbmtzOiBudW1iZXJbXSA9IFsxMCwgOSwgOCwgNywgNiwgNSwgNCwgMywgMiwgMV07XG5cbmNvbnN0IGZpbGVzOCA9IGNnLmZpbGVzLnNsaWNlKDAsIDgpO1xuY29uc3QgZmlsZXM5ID0gY2cuZmlsZXMuc2xpY2UoMCwgOSk7XG5jb25zdCBmaWxlczEwID0gY2cuZmlsZXMuc2xpY2UoMCwgMTApO1xuXG5jb25zdCByYW5rczggPSBjZy5yYW5rcy5zbGljZSgxLCA5KTtcbmNvbnN0IHJhbmtzOSA9IGNnLnJhbmtzLnNsaWNlKDEsIDEwKTtcbi8vIHdlIGhhdmUgdG8gY291bnQgcmFua3Mgc3RhcnRpbmcgZnJvbSAwIGFzIGluIFVDQ0lcbmNvbnN0IHJhbmtzMTAgPSBjZy5yYW5rcy5zbGljZSgwLCAxMCk7XG5cbmNvbnN0IGFsbEtleXM4eDg6IGNnLktleVtdID0gQXJyYXkucHJvdG90eXBlLmNvbmNhdCguLi5maWxlczgubWFwKGMgPT4gcmFua3M4Lm1hcChyID0+IGMrcikpKTtcbmNvbnN0IGFsbEtleXM5eDk6IGNnLktleVtdID0gQXJyYXkucHJvdG90eXBlLmNvbmNhdCguLi5maWxlczkubWFwKGMgPT4gcmFua3M5Lm1hcChyID0+IGMrcikpKTtcbmNvbnN0IGFsbEtleXMxMHg4OiBjZy5LZXlbXSA9IEFycmF5LnByb3RvdHlwZS5jb25jYXQoLi4uZmlsZXMxMC5tYXAoYyA9PiByYW5rczgubWFwKHIgPT4gYytyKSkpO1xuY29uc3QgYWxsS2V5czl4MTA6IGNnLktleVtdID0gQXJyYXkucHJvdG90eXBlLmNvbmNhdCguLi5maWxlczkubWFwKGMgPT4gcmFua3MxMC5tYXAociA9PiBjK3IpKSk7XG5jb25zdCBhbGxLZXlzMTB4MTA6IGNnLktleVtdID0gQXJyYXkucHJvdG90eXBlLmNvbmNhdCguLi5maWxlczEwLm1hcChjID0+IHJhbmtzMTAubWFwKHIgPT4gYytyKSkpO1xuXG5leHBvcnQgY29uc3QgYWxsS2V5cyA9IFthbGxLZXlzOHg4LCBhbGxLZXlzOXg5LCBhbGxLZXlzMTB4OCwgYWxsS2V5czl4MTAsIGFsbEtleXMxMHgxMF07XG5cbmV4cG9ydCBmdW5jdGlvbiBwb3Mya2V5KHBvczogY2cuUG9zLCBnZW9tOiBjZy5HZW9tZXRyeSkge1xuICAgIGNvbnN0IGJkID0gY2cuZGltZW5zaW9uc1tnZW9tXTtcbiAgICByZXR1cm4gYWxsS2V5c1tnZW9tXVtiZC5oZWlnaHQgKiBwb3NbMF0gKyBwb3NbMV0gLSBiZC5oZWlnaHQgLSAxXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGtleTJwb3MoazogY2cuS2V5LCBmaXJzdFJhbmtJczA6IGJvb2xlYW4pIHtcbiAgY29uc3Qgc2hpZnQgPSBmaXJzdFJhbmtJczAgPyAxIDogMDtcbiAgcmV0dXJuIFtrLmNoYXJDb2RlQXQoMCkgLSA5Niwgay5jaGFyQ29kZUF0KDEpIC0gNDggKyBzaGlmdF0gYXMgY2cuUG9zO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWVtbzxBPihmOiAoKSA9PiBBKTogY2cuTWVtbzxBPiB7XG4gIGxldCB2OiBBIHwgdW5kZWZpbmVkO1xuICBjb25zdCByZXQ6IGFueSA9ICgpID0+IHtcbiAgICBpZiAodiA9PT0gdW5kZWZpbmVkKSB2ID0gZigpO1xuICAgIHJldHVybiB2O1xuICB9O1xuICByZXQuY2xlYXIgPSAoKSA9PiB7IHYgPSB1bmRlZmluZWQgfTtcbiAgcmV0dXJuIHJldDtcbn1cblxuZXhwb3J0IGNvbnN0IHRpbWVyOiAoKSA9PiBjZy5UaW1lciA9ICgpID0+IHtcbiAgbGV0IHN0YXJ0QXQ6IG51bWJlciB8IHVuZGVmaW5lZDtcbiAgcmV0dXJuIHtcbiAgICBzdGFydCgpIHsgc3RhcnRBdCA9IHBlcmZvcm1hbmNlLm5vdygpIH0sXG4gICAgY2FuY2VsKCkgeyBzdGFydEF0ID0gdW5kZWZpbmVkIH0sXG4gICAgc3RvcCgpIHtcbiAgICAgIGlmICghc3RhcnRBdCkgcmV0dXJuIDA7XG4gICAgICBjb25zdCB0aW1lID0gcGVyZm9ybWFuY2Uubm93KCkgLSBzdGFydEF0O1xuICAgICAgc3RhcnRBdCA9IHVuZGVmaW5lZDtcbiAgICAgIHJldHVybiB0aW1lO1xuICAgIH1cbiAgfTtcbn1cblxuZXhwb3J0IGNvbnN0IG9wcG9zaXRlID0gKGM6IGNnLkNvbG9yKSA9PiBjID09PSAnd2hpdGUnID8gJ2JsYWNrJyA6ICd3aGl0ZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBjb250YWluc1g8WD4oeHM6IFhbXSB8IHVuZGVmaW5lZCwgeDogWCk6IGJvb2xlYW4ge1xuICByZXR1cm4geHMgIT09IHVuZGVmaW5lZCAmJiB4cy5pbmRleE9mKHgpICE9PSAtMTtcbn1cblxuZXhwb3J0IGNvbnN0IGRpc3RhbmNlU3E6IChwb3MxOiBjZy5Qb3MsIHBvczI6IGNnLlBvcykgPT4gbnVtYmVyID0gKHBvczEsIHBvczIpID0+IHtcbiAgcmV0dXJuIE1hdGgucG93KHBvczFbMF0gLSBwb3MyWzBdLCAyKSArIE1hdGgucG93KHBvczFbMV0gLSBwb3MyWzFdLCAyKTtcbn1cblxuZXhwb3J0IGNvbnN0IHNhbWVQaWVjZTogKHAxOiBjZy5QaWVjZSwgcDI6IGNnLlBpZWNlKSA9PiBib29sZWFuID0gKHAxLCBwMikgPT5cbiAgcDEucm9sZSA9PT0gcDIucm9sZSAmJiBwMS5jb2xvciA9PT0gcDIuY29sb3I7XG5cbmNvbnN0IHBvc1RvVHJhbnNsYXRlQmFzZTogKHBvczogY2cuUG9zLCBhc1doaXRlOiBib29sZWFuLCB4RmFjdG9yOiBudW1iZXIsIHlGYWN0b3I6IG51bWJlciwgYnQ6IGNnLkJvYXJkRGltZW5zaW9ucykgPT4gY2cuTnVtYmVyUGFpciA9XG4ocG9zLCBhc1doaXRlLCB4RmFjdG9yLCB5RmFjdG9yLCBidCkgPT4gW1xuICAoYXNXaGl0ZSA/IHBvc1swXSAtIDEgOiBidC53aWR0aCAtIHBvc1swXSkgKiB4RmFjdG9yLFxuICAoYXNXaGl0ZSA/IGJ0LmhlaWdodCAtIHBvc1sxXSA6IHBvc1sxXSAtIDEpICogeUZhY3RvclxuXTtcblxuZXhwb3J0IGNvbnN0IHBvc1RvVHJhbnNsYXRlQWJzID0gKGJvdW5kczogQ2xpZW50UmVjdCwgYnQ6IGNnLkJvYXJkRGltZW5zaW9ucykgPT4ge1xuICBjb25zdCB4RmFjdG9yID0gYm91bmRzLndpZHRoIC8gYnQud2lkdGgsXG4gIHlGYWN0b3IgPSBib3VuZHMuaGVpZ2h0IC8gYnQuaGVpZ2h0O1xuICByZXR1cm4gKHBvczogY2cuUG9zLCBhc1doaXRlOiBib29sZWFuKSA9PiBwb3NUb1RyYW5zbGF0ZUJhc2UocG9zLCBhc1doaXRlLCB4RmFjdG9yLCB5RmFjdG9yLCBidCk7XG59O1xuXG5leHBvcnQgY29uc3QgcG9zVG9UcmFuc2xhdGVSZWw6IChwb3M6IGNnLlBvcywgYXNXaGl0ZTogYm9vbGVhbiwgYnQ6IGNnLkJvYXJkRGltZW5zaW9ucykgPT4gY2cuTnVtYmVyUGFpciA9XG4gIChwb3MsIGFzV2hpdGUsIGJ0KSA9PiBwb3NUb1RyYW5zbGF0ZUJhc2UocG9zLCBhc1doaXRlLCAxMDAgLyBidC53aWR0aCwgMTAwIC8gYnQuaGVpZ2h0LCBidCk7XG5cbmV4cG9ydCBjb25zdCB0cmFuc2xhdGVBYnMgPSAoZWw6IEhUTUxFbGVtZW50LCBwb3M6IGNnLlBvcykgPT4ge1xuICBlbC5zdHlsZS50cmFuc2Zvcm0gPSBgdHJhbnNsYXRlKCR7cG9zWzBdfXB4LCR7cG9zWzFdfXB4KWA7XG59XG5cbmV4cG9ydCBjb25zdCB0cmFuc2xhdGVSZWwgPSAoZWw6IEhUTUxFbGVtZW50LCBwZXJjZW50czogY2cuTnVtYmVyUGFpcikgPT4ge1xuICBlbC5zdHlsZS5sZWZ0ID0gcGVyY2VudHNbMF0gKyAnJSc7XG4gIGVsLnN0eWxlLnRvcCA9IHBlcmNlbnRzWzFdICsgJyUnO1xufVxuXG5leHBvcnQgY29uc3Qgc2V0VmlzaWJsZSA9IChlbDogSFRNTEVsZW1lbnQsIHY6IGJvb2xlYW4pID0+IHtcbiAgZWwuc3R5bGUudmlzaWJpbGl0eSA9IHYgPyAndmlzaWJsZScgOiAnaGlkZGVuJztcbn1cblxuLy8gdG91Y2hlbmQgaGFzIG5vIHBvc2l0aW9uIVxuZXhwb3J0IGNvbnN0IGV2ZW50UG9zaXRpb246IChlOiBjZy5Nb3VjaEV2ZW50KSA9PiBjZy5OdW1iZXJQYWlyIHwgdW5kZWZpbmVkID0gZSA9PiB7XG4gIGlmIChlLmNsaWVudFggfHwgZS5jbGllbnRYID09PSAwKSByZXR1cm4gW2UuY2xpZW50WCwgZS5jbGllbnRZXTtcbiAgaWYgKGUudG91Y2hlcyAmJiBlLnRhcmdldFRvdWNoZXNbMF0pIHJldHVybiBbZS50YXJnZXRUb3VjaGVzWzBdLmNsaWVudFgsIGUudGFyZ2V0VG91Y2hlc1swXS5jbGllbnRZXTtcbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGNvbnN0IGlzUmlnaHRCdXR0b24gPSAoZTogTW91c2VFdmVudCkgPT4gZS5idXR0b25zID09PSAyIHx8IGUuYnV0dG9uID09PSAyO1xuXG5leHBvcnQgY29uc3QgY3JlYXRlRWwgPSAodGFnTmFtZTogc3RyaW5nLCBjbGFzc05hbWU/OiBzdHJpbmcpID0+IHtcbiAgY29uc3QgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZ05hbWUpO1xuICBpZiAoY2xhc3NOYW1lKSBlbC5jbGFzc05hbWUgPSBjbGFzc05hbWU7XG4gIHJldHVybiBlbDtcbn1cbiIsImltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSdcbmltcG9ydCB7IGNvbG9ycywgc2V0VmlzaWJsZSwgY3JlYXRlRWwgfSBmcm9tICcuL3V0aWwnXG5pbXBvcnQgeyBmaWxlcywgcmFua3MgfSBmcm9tICcuL3R5cGVzJ1xuaW1wb3J0IHsgY3JlYXRlRWxlbWVudCBhcyBjcmVhdGVTVkcgfSBmcm9tICcuL3N2ZydcbmltcG9ydCB7IEVsZW1lbnRzLCBHZW9tZXRyeSB9IGZyb20gJy4vdHlwZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHdyYXAoZWxlbWVudDogSFRNTEVsZW1lbnQsIHM6IFN0YXRlLCByZWxhdGl2ZTogYm9vbGVhbik6IEVsZW1lbnRzIHtcblxuICAvLyAuY2ctd3JhcCAoZWxlbWVudCBwYXNzZWQgdG8gQ2hlc3Nncm91bmQpXG4gIC8vICAgY2ctaGVscGVyICgxMi41JSlcbiAgLy8gICAgIGNnLWNvbnRhaW5lciAoODAwJSlcbiAgLy8gICAgICAgY2ctYm9hcmRcbiAgLy8gICAgICAgc3ZnXG4gIC8vICAgICAgIGNvb3Jkcy5yYW5rc1xuICAvLyAgICAgICBjb29yZHMuZmlsZXNcbiAgLy8gICAgICAgcGllY2UuZ2hvc3RcblxuICBlbGVtZW50LmlubmVySFRNTCA9ICcnO1xuXG4gIC8vIGVuc3VyZSB0aGUgY2ctd3JhcCBjbGFzcyBpcyBzZXRcbiAgLy8gc28gYm91bmRzIGNhbGN1bGF0aW9uIGNhbiB1c2UgdGhlIENTUyB3aWR0aC9oZWlnaHQgdmFsdWVzXG4gIC8vIGFkZCB0aGF0IGNsYXNzIHlvdXJzZWxmIHRvIHRoZSBlbGVtZW50IGJlZm9yZSBjYWxsaW5nIGNoZXNzZ3JvdW5kXG4gIC8vIGZvciBhIHNsaWdodCBwZXJmb3JtYW5jZSBpbXByb3ZlbWVudCEgKGF2b2lkcyByZWNvbXB1dGluZyBzdHlsZSlcbiAgZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdjZy13cmFwJyk7XG5cbiAgY29sb3JzLmZvckVhY2goYyA9PiBlbGVtZW50LmNsYXNzTGlzdC50b2dnbGUoJ29yaWVudGF0aW9uLScgKyBjLCBzLm9yaWVudGF0aW9uID09PSBjKSk7XG4gIGVsZW1lbnQuY2xhc3NMaXN0LnRvZ2dsZSgnbWFuaXB1bGFibGUnLCAhcy52aWV3T25seSk7XG5cbiAgY29uc3QgaGVscGVyID0gY3JlYXRlRWwoJ2NnLWhlbHBlcicpO1xuICBlbGVtZW50LmFwcGVuZENoaWxkKGhlbHBlcik7XG4gIGNvbnN0IGNvbnRhaW5lciA9IGNyZWF0ZUVsKCdjZy1jb250YWluZXInKTtcbiAgaGVscGVyLmFwcGVuZENoaWxkKGNvbnRhaW5lcik7XG5cbiAgY29uc3QgZXh0ZW5zaW9uID0gY3JlYXRlRWwoJ2V4dGVuc2lvbicpO1xuICBjb250YWluZXIuYXBwZW5kQ2hpbGQoZXh0ZW5zaW9uKTtcbiAgY29uc3QgYm9hcmQgPSBjcmVhdGVFbCgnY2ctYm9hcmQnKTtcbiAgY29udGFpbmVyLmFwcGVuZENoaWxkKGJvYXJkKTtcblxuICBsZXQgc3ZnOiBTVkdFbGVtZW50IHwgdW5kZWZpbmVkO1xuICBpZiAocy5kcmF3YWJsZS52aXNpYmxlICYmICFyZWxhdGl2ZSkge1xuICAgIHN2ZyA9IGNyZWF0ZVNWRygnc3ZnJyk7XG4gICAgc3ZnLmFwcGVuZENoaWxkKGNyZWF0ZVNWRygnZGVmcycpKTtcbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoc3ZnKTtcbiAgfVxuXG4gIGlmIChzLmNvb3JkaW5hdGVzKSB7XG4gICAgY29uc3Qgb3JpZW50Q2xhc3MgPSBzLm9yaWVudGF0aW9uID09PSAnYmxhY2snID8gJyBibGFjaycgOiAnJztcbiAgICBjb25zdCBmaXJzdFJhbmtJczAgPSBzLmdlb21ldHJ5ID09PSBHZW9tZXRyeS5kaW05eDEwO1xuICAgIGNvbnN0IHNoaWZ0ID0gZmlyc3RSYW5rSXMwID8gMCA6IDE7XG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHJlbmRlckNvb3JkcyhyYW5rcy5zbGljZShzaGlmdCwgcy5kaW1lbnNpb25zLmhlaWdodCArIHNoaWZ0KSwgJ3JhbmtzJyArIG9yaWVudENsYXNzKSk7XG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHJlbmRlckNvb3JkcyhmaWxlcy5zbGljZSgwLCBzLmRpbWVuc2lvbnMud2lkdGgpLCAnZmlsZXMnICsgb3JpZW50Q2xhc3MpKTtcbiAgfVxuXG4gIGxldCBnaG9zdDogSFRNTEVsZW1lbnQgfCB1bmRlZmluZWQ7XG4gIGlmIChzLmRyYWdnYWJsZS5zaG93R2hvc3QgJiYgIXJlbGF0aXZlKSB7XG4gICAgZ2hvc3QgPSBjcmVhdGVFbCgncGllY2UnLCAnZ2hvc3QnKTtcbiAgICBzZXRWaXNpYmxlKGdob3N0LCBmYWxzZSk7XG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGdob3N0KTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgYm9hcmQsXG4gICAgY29udGFpbmVyLFxuICAgIGdob3N0LFxuICAgIHN2Z1xuICB9O1xufVxuXG5mdW5jdGlvbiByZW5kZXJDb29yZHMoZWxlbXM6IGFueVtdLCBjbGFzc05hbWU6IHN0cmluZyk6IEhUTUxFbGVtZW50IHtcbiAgY29uc3QgZWwgPSBjcmVhdGVFbCgnY29vcmRzJywgY2xhc3NOYW1lKTtcbiAgbGV0IGY6IEhUTUxFbGVtZW50O1xuICBmb3IgKGxldCBpIGluIGVsZW1zKSB7XG4gICAgZiA9IGNyZWF0ZUVsKCdjb29yZCcpO1xuICAgIGYudGV4dENvbnRlbnQgPSBlbGVtc1tpXTtcbiAgICBlbC5hcHBlbmRDaGlsZChmKTtcbiAgfVxuICByZXR1cm4gZWw7XG59XG4iLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbnZhciB2bm9kZV8xID0gcmVxdWlyZShcIi4vdm5vZGVcIik7XG52YXIgaXMgPSByZXF1aXJlKFwiLi9pc1wiKTtcbmZ1bmN0aW9uIGFkZE5TKGRhdGEsIGNoaWxkcmVuLCBzZWwpIHtcbiAgICBkYXRhLm5zID0gJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJztcbiAgICBpZiAoc2VsICE9PSAnZm9yZWlnbk9iamVjdCcgJiYgY2hpbGRyZW4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICB2YXIgY2hpbGREYXRhID0gY2hpbGRyZW5baV0uZGF0YTtcbiAgICAgICAgICAgIGlmIChjaGlsZERhdGEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGFkZE5TKGNoaWxkRGF0YSwgY2hpbGRyZW5baV0uY2hpbGRyZW4sIGNoaWxkcmVuW2ldLnNlbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5mdW5jdGlvbiBoKHNlbCwgYiwgYykge1xuICAgIHZhciBkYXRhID0ge30sIGNoaWxkcmVuLCB0ZXh0LCBpO1xuICAgIGlmIChjICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZGF0YSA9IGI7XG4gICAgICAgIGlmIChpcy5hcnJheShjKSkge1xuICAgICAgICAgICAgY2hpbGRyZW4gPSBjO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGlzLnByaW1pdGl2ZShjKSkge1xuICAgICAgICAgICAgdGV4dCA9IGM7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoYyAmJiBjLnNlbCkge1xuICAgICAgICAgICAgY2hpbGRyZW4gPSBbY107XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAoYiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChpcy5hcnJheShiKSkge1xuICAgICAgICAgICAgY2hpbGRyZW4gPSBiO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGlzLnByaW1pdGl2ZShiKSkge1xuICAgICAgICAgICAgdGV4dCA9IGI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoYiAmJiBiLnNlbCkge1xuICAgICAgICAgICAgY2hpbGRyZW4gPSBbYl07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkYXRhID0gYjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoY2hpbGRyZW4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGlmIChpcy5wcmltaXRpdmUoY2hpbGRyZW5baV0pKVxuICAgICAgICAgICAgICAgIGNoaWxkcmVuW2ldID0gdm5vZGVfMS52bm9kZSh1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBjaGlsZHJlbltpXSwgdW5kZWZpbmVkKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoc2VsWzBdID09PSAncycgJiYgc2VsWzFdID09PSAndicgJiYgc2VsWzJdID09PSAnZycgJiZcbiAgICAgICAgKHNlbC5sZW5ndGggPT09IDMgfHwgc2VsWzNdID09PSAnLicgfHwgc2VsWzNdID09PSAnIycpKSB7XG4gICAgICAgIGFkZE5TKGRhdGEsIGNoaWxkcmVuLCBzZWwpO1xuICAgIH1cbiAgICByZXR1cm4gdm5vZGVfMS52bm9kZShzZWwsIGRhdGEsIGNoaWxkcmVuLCB0ZXh0LCB1bmRlZmluZWQpO1xufVxuZXhwb3J0cy5oID0gaDtcbjtcbmV4cG9ydHMuZGVmYXVsdCA9IGg7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1oLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZnVuY3Rpb24gY3JlYXRlRWxlbWVudCh0YWdOYW1lKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG59XG5mdW5jdGlvbiBjcmVhdGVFbGVtZW50TlMobmFtZXNwYWNlVVJJLCBxdWFsaWZpZWROYW1lKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhuYW1lc3BhY2VVUkksIHF1YWxpZmllZE5hbWUpO1xufVxuZnVuY3Rpb24gY3JlYXRlVGV4dE5vZGUodGV4dCkge1xuICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh0ZXh0KTtcbn1cbmZ1bmN0aW9uIGNyZWF0ZUNvbW1lbnQodGV4dCkge1xuICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVDb21tZW50KHRleHQpO1xufVxuZnVuY3Rpb24gaW5zZXJ0QmVmb3JlKHBhcmVudE5vZGUsIG5ld05vZGUsIHJlZmVyZW5jZU5vZGUpIHtcbiAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZShuZXdOb2RlLCByZWZlcmVuY2VOb2RlKTtcbn1cbmZ1bmN0aW9uIHJlbW92ZUNoaWxkKG5vZGUsIGNoaWxkKSB7XG4gICAgbm9kZS5yZW1vdmVDaGlsZChjaGlsZCk7XG59XG5mdW5jdGlvbiBhcHBlbmRDaGlsZChub2RlLCBjaGlsZCkge1xuICAgIG5vZGUuYXBwZW5kQ2hpbGQoY2hpbGQpO1xufVxuZnVuY3Rpb24gcGFyZW50Tm9kZShub2RlKSB7XG4gICAgcmV0dXJuIG5vZGUucGFyZW50Tm9kZTtcbn1cbmZ1bmN0aW9uIG5leHRTaWJsaW5nKG5vZGUpIHtcbiAgICByZXR1cm4gbm9kZS5uZXh0U2libGluZztcbn1cbmZ1bmN0aW9uIHRhZ05hbWUoZWxtKSB7XG4gICAgcmV0dXJuIGVsbS50YWdOYW1lO1xufVxuZnVuY3Rpb24gc2V0VGV4dENvbnRlbnQobm9kZSwgdGV4dCkge1xuICAgIG5vZGUudGV4dENvbnRlbnQgPSB0ZXh0O1xufVxuZnVuY3Rpb24gZ2V0VGV4dENvbnRlbnQobm9kZSkge1xuICAgIHJldHVybiBub2RlLnRleHRDb250ZW50O1xufVxuZnVuY3Rpb24gaXNFbGVtZW50KG5vZGUpIHtcbiAgICByZXR1cm4gbm9kZS5ub2RlVHlwZSA9PT0gMTtcbn1cbmZ1bmN0aW9uIGlzVGV4dChub2RlKSB7XG4gICAgcmV0dXJuIG5vZGUubm9kZVR5cGUgPT09IDM7XG59XG5mdW5jdGlvbiBpc0NvbW1lbnQobm9kZSkge1xuICAgIHJldHVybiBub2RlLm5vZGVUeXBlID09PSA4O1xufVxuZXhwb3J0cy5odG1sRG9tQXBpID0ge1xuICAgIGNyZWF0ZUVsZW1lbnQ6IGNyZWF0ZUVsZW1lbnQsXG4gICAgY3JlYXRlRWxlbWVudE5TOiBjcmVhdGVFbGVtZW50TlMsXG4gICAgY3JlYXRlVGV4dE5vZGU6IGNyZWF0ZVRleHROb2RlLFxuICAgIGNyZWF0ZUNvbW1lbnQ6IGNyZWF0ZUNvbW1lbnQsXG4gICAgaW5zZXJ0QmVmb3JlOiBpbnNlcnRCZWZvcmUsXG4gICAgcmVtb3ZlQ2hpbGQ6IHJlbW92ZUNoaWxkLFxuICAgIGFwcGVuZENoaWxkOiBhcHBlbmRDaGlsZCxcbiAgICBwYXJlbnROb2RlOiBwYXJlbnROb2RlLFxuICAgIG5leHRTaWJsaW5nOiBuZXh0U2libGluZyxcbiAgICB0YWdOYW1lOiB0YWdOYW1lLFxuICAgIHNldFRleHRDb250ZW50OiBzZXRUZXh0Q29udGVudCxcbiAgICBnZXRUZXh0Q29udGVudDogZ2V0VGV4dENvbnRlbnQsXG4gICAgaXNFbGVtZW50OiBpc0VsZW1lbnQsXG4gICAgaXNUZXh0OiBpc1RleHQsXG4gICAgaXNDb21tZW50OiBpc0NvbW1lbnQsXG59O1xuZXhwb3J0cy5kZWZhdWx0ID0gZXhwb3J0cy5odG1sRG9tQXBpO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aHRtbGRvbWFwaS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuYXJyYXkgPSBBcnJheS5pc0FycmF5O1xuZnVuY3Rpb24gcHJpbWl0aXZlKHMpIHtcbiAgICByZXR1cm4gdHlwZW9mIHMgPT09ICdzdHJpbmcnIHx8IHR5cGVvZiBzID09PSAnbnVtYmVyJztcbn1cbmV4cG9ydHMucHJpbWl0aXZlID0gcHJpbWl0aXZlO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aXMuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG52YXIgeGxpbmtOUyA9ICdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rJztcbnZhciB4bWxOUyA9ICdodHRwOi8vd3d3LnczLm9yZy9YTUwvMTk5OC9uYW1lc3BhY2UnO1xudmFyIGNvbG9uQ2hhciA9IDU4O1xudmFyIHhDaGFyID0gMTIwO1xuZnVuY3Rpb24gdXBkYXRlQXR0cnMob2xkVm5vZGUsIHZub2RlKSB7XG4gICAgdmFyIGtleSwgZWxtID0gdm5vZGUuZWxtLCBvbGRBdHRycyA9IG9sZFZub2RlLmRhdGEuYXR0cnMsIGF0dHJzID0gdm5vZGUuZGF0YS5hdHRycztcbiAgICBpZiAoIW9sZEF0dHJzICYmICFhdHRycylcbiAgICAgICAgcmV0dXJuO1xuICAgIGlmIChvbGRBdHRycyA9PT0gYXR0cnMpXG4gICAgICAgIHJldHVybjtcbiAgICBvbGRBdHRycyA9IG9sZEF0dHJzIHx8IHt9O1xuICAgIGF0dHJzID0gYXR0cnMgfHwge307XG4gICAgLy8gdXBkYXRlIG1vZGlmaWVkIGF0dHJpYnV0ZXMsIGFkZCBuZXcgYXR0cmlidXRlc1xuICAgIGZvciAoa2V5IGluIGF0dHJzKSB7XG4gICAgICAgIHZhciBjdXIgPSBhdHRyc1trZXldO1xuICAgICAgICB2YXIgb2xkID0gb2xkQXR0cnNba2V5XTtcbiAgICAgICAgaWYgKG9sZCAhPT0gY3VyKSB7XG4gICAgICAgICAgICBpZiAoY3VyID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgZWxtLnNldEF0dHJpYnV0ZShrZXksIFwiXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY3VyID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIGVsbS5yZW1vdmVBdHRyaWJ1dGUoa2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChrZXkuY2hhckNvZGVBdCgwKSAhPT0geENoYXIpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxtLnNldEF0dHJpYnV0ZShrZXksIGN1cik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGtleS5jaGFyQ29kZUF0KDMpID09PSBjb2xvbkNoYXIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQXNzdW1lIHhtbCBuYW1lc3BhY2VcbiAgICAgICAgICAgICAgICAgICAgZWxtLnNldEF0dHJpYnV0ZU5TKHhtbE5TLCBrZXksIGN1cik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGtleS5jaGFyQ29kZUF0KDUpID09PSBjb2xvbkNoYXIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQXNzdW1lIHhsaW5rIG5hbWVzcGFjZVxuICAgICAgICAgICAgICAgICAgICBlbG0uc2V0QXR0cmlidXRlTlMoeGxpbmtOUywga2V5LCBjdXIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZWxtLnNldEF0dHJpYnV0ZShrZXksIGN1cik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIHJlbW92ZSByZW1vdmVkIGF0dHJpYnV0ZXNcbiAgICAvLyB1c2UgYGluYCBvcGVyYXRvciBzaW5jZSB0aGUgcHJldmlvdXMgYGZvcmAgaXRlcmF0aW9uIHVzZXMgaXQgKC5pLmUuIGFkZCBldmVuIGF0dHJpYnV0ZXMgd2l0aCB1bmRlZmluZWQgdmFsdWUpXG4gICAgLy8gdGhlIG90aGVyIG9wdGlvbiBpcyB0byByZW1vdmUgYWxsIGF0dHJpYnV0ZXMgd2l0aCB2YWx1ZSA9PSB1bmRlZmluZWRcbiAgICBmb3IgKGtleSBpbiBvbGRBdHRycykge1xuICAgICAgICBpZiAoIShrZXkgaW4gYXR0cnMpKSB7XG4gICAgICAgICAgICBlbG0ucmVtb3ZlQXR0cmlidXRlKGtleSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5leHBvcnRzLmF0dHJpYnV0ZXNNb2R1bGUgPSB7IGNyZWF0ZTogdXBkYXRlQXR0cnMsIHVwZGF0ZTogdXBkYXRlQXR0cnMgfTtcbmV4cG9ydHMuZGVmYXVsdCA9IGV4cG9ydHMuYXR0cmlidXRlc01vZHVsZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWF0dHJpYnV0ZXMuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5mdW5jdGlvbiB1cGRhdGVDbGFzcyhvbGRWbm9kZSwgdm5vZGUpIHtcbiAgICB2YXIgY3VyLCBuYW1lLCBlbG0gPSB2bm9kZS5lbG0sIG9sZENsYXNzID0gb2xkVm5vZGUuZGF0YS5jbGFzcywga2xhc3MgPSB2bm9kZS5kYXRhLmNsYXNzO1xuICAgIGlmICghb2xkQ2xhc3MgJiYgIWtsYXNzKVxuICAgICAgICByZXR1cm47XG4gICAgaWYgKG9sZENsYXNzID09PSBrbGFzcylcbiAgICAgICAgcmV0dXJuO1xuICAgIG9sZENsYXNzID0gb2xkQ2xhc3MgfHwge307XG4gICAga2xhc3MgPSBrbGFzcyB8fCB7fTtcbiAgICBmb3IgKG5hbWUgaW4gb2xkQ2xhc3MpIHtcbiAgICAgICAgaWYgKCFrbGFzc1tuYW1lXSkge1xuICAgICAgICAgICAgZWxtLmNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZm9yIChuYW1lIGluIGtsYXNzKSB7XG4gICAgICAgIGN1ciA9IGtsYXNzW25hbWVdO1xuICAgICAgICBpZiAoY3VyICE9PSBvbGRDbGFzc1tuYW1lXSkge1xuICAgICAgICAgICAgZWxtLmNsYXNzTGlzdFtjdXIgPyAnYWRkJyA6ICdyZW1vdmUnXShuYW1lKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbmV4cG9ydHMuY2xhc3NNb2R1bGUgPSB7IGNyZWF0ZTogdXBkYXRlQ2xhc3MsIHVwZGF0ZTogdXBkYXRlQ2xhc3MgfTtcbmV4cG9ydHMuZGVmYXVsdCA9IGV4cG9ydHMuY2xhc3NNb2R1bGU7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1jbGFzcy5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmZ1bmN0aW9uIGludm9rZUhhbmRsZXIoaGFuZGxlciwgdm5vZGUsIGV2ZW50KSB7XG4gICAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgLy8gY2FsbCBmdW5jdGlvbiBoYW5kbGVyXG4gICAgICAgIGhhbmRsZXIuY2FsbCh2bm9kZSwgZXZlbnQsIHZub2RlKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGhhbmRsZXIgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgLy8gY2FsbCBoYW5kbGVyIHdpdGggYXJndW1lbnRzXG4gICAgICAgIGlmICh0eXBlb2YgaGFuZGxlclswXSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAvLyBzcGVjaWFsIGNhc2UgZm9yIHNpbmdsZSBhcmd1bWVudCBmb3IgcGVyZm9ybWFuY2VcbiAgICAgICAgICAgIGlmIChoYW5kbGVyLmxlbmd0aCA9PT0gMikge1xuICAgICAgICAgICAgICAgIGhhbmRsZXJbMF0uY2FsbCh2bm9kZSwgaGFuZGxlclsxXSwgZXZlbnQsIHZub2RlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gaGFuZGxlci5zbGljZSgxKTtcbiAgICAgICAgICAgICAgICBhcmdzLnB1c2goZXZlbnQpO1xuICAgICAgICAgICAgICAgIGFyZ3MucHVzaCh2bm9kZSk7XG4gICAgICAgICAgICAgICAgaGFuZGxlclswXS5hcHBseSh2bm9kZSwgYXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBjYWxsIG11bHRpcGxlIGhhbmRsZXJzXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhhbmRsZXIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpbnZva2VIYW5kbGVyKGhhbmRsZXJbaV0sIHZub2RlLCBldmVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5mdW5jdGlvbiBoYW5kbGVFdmVudChldmVudCwgdm5vZGUpIHtcbiAgICB2YXIgbmFtZSA9IGV2ZW50LnR5cGUsIG9uID0gdm5vZGUuZGF0YS5vbjtcbiAgICAvLyBjYWxsIGV2ZW50IGhhbmRsZXIocykgaWYgZXhpc3RzXG4gICAgaWYgKG9uICYmIG9uW25hbWVdKSB7XG4gICAgICAgIGludm9rZUhhbmRsZXIob25bbmFtZV0sIHZub2RlLCBldmVudCk7XG4gICAgfVxufVxuZnVuY3Rpb24gY3JlYXRlTGlzdGVuZXIoKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQpIHtcbiAgICAgICAgaGFuZGxlRXZlbnQoZXZlbnQsIGhhbmRsZXIudm5vZGUpO1xuICAgIH07XG59XG5mdW5jdGlvbiB1cGRhdGVFdmVudExpc3RlbmVycyhvbGRWbm9kZSwgdm5vZGUpIHtcbiAgICB2YXIgb2xkT24gPSBvbGRWbm9kZS5kYXRhLm9uLCBvbGRMaXN0ZW5lciA9IG9sZFZub2RlLmxpc3RlbmVyLCBvbGRFbG0gPSBvbGRWbm9kZS5lbG0sIG9uID0gdm5vZGUgJiYgdm5vZGUuZGF0YS5vbiwgZWxtID0gKHZub2RlICYmIHZub2RlLmVsbSksIG5hbWU7XG4gICAgLy8gb3B0aW1pemF0aW9uIGZvciByZXVzZWQgaW1tdXRhYmxlIGhhbmRsZXJzXG4gICAgaWYgKG9sZE9uID09PSBvbikge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIHJlbW92ZSBleGlzdGluZyBsaXN0ZW5lcnMgd2hpY2ggbm8gbG9uZ2VyIHVzZWRcbiAgICBpZiAob2xkT24gJiYgb2xkTGlzdGVuZXIpIHtcbiAgICAgICAgLy8gaWYgZWxlbWVudCBjaGFuZ2VkIG9yIGRlbGV0ZWQgd2UgcmVtb3ZlIGFsbCBleGlzdGluZyBsaXN0ZW5lcnMgdW5jb25kaXRpb25hbGx5XG4gICAgICAgIGlmICghb24pIHtcbiAgICAgICAgICAgIGZvciAobmFtZSBpbiBvbGRPbikge1xuICAgICAgICAgICAgICAgIC8vIHJlbW92ZSBsaXN0ZW5lciBpZiBlbGVtZW50IHdhcyBjaGFuZ2VkIG9yIGV4aXN0aW5nIGxpc3RlbmVycyByZW1vdmVkXG4gICAgICAgICAgICAgICAgb2xkRWxtLnJlbW92ZUV2ZW50TGlzdGVuZXIobmFtZSwgb2xkTGlzdGVuZXIsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGZvciAobmFtZSBpbiBvbGRPbikge1xuICAgICAgICAgICAgICAgIC8vIHJlbW92ZSBsaXN0ZW5lciBpZiBleGlzdGluZyBsaXN0ZW5lciByZW1vdmVkXG4gICAgICAgICAgICAgICAgaWYgKCFvbltuYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICBvbGRFbG0ucmVtb3ZlRXZlbnRMaXN0ZW5lcihuYW1lLCBvbGRMaXN0ZW5lciwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBhZGQgbmV3IGxpc3RlbmVycyB3aGljaCBoYXMgbm90IGFscmVhZHkgYXR0YWNoZWRcbiAgICBpZiAob24pIHtcbiAgICAgICAgLy8gcmV1c2UgZXhpc3RpbmcgbGlzdGVuZXIgb3IgY3JlYXRlIG5ld1xuICAgICAgICB2YXIgbGlzdGVuZXIgPSB2bm9kZS5saXN0ZW5lciA9IG9sZFZub2RlLmxpc3RlbmVyIHx8IGNyZWF0ZUxpc3RlbmVyKCk7XG4gICAgICAgIC8vIHVwZGF0ZSB2bm9kZSBmb3IgbGlzdGVuZXJcbiAgICAgICAgbGlzdGVuZXIudm5vZGUgPSB2bm9kZTtcbiAgICAgICAgLy8gaWYgZWxlbWVudCBjaGFuZ2VkIG9yIGFkZGVkIHdlIGFkZCBhbGwgbmVlZGVkIGxpc3RlbmVycyB1bmNvbmRpdGlvbmFsbHlcbiAgICAgICAgaWYgKCFvbGRPbikge1xuICAgICAgICAgICAgZm9yIChuYW1lIGluIG9uKSB7XG4gICAgICAgICAgICAgICAgLy8gYWRkIGxpc3RlbmVyIGlmIGVsZW1lbnQgd2FzIGNoYW5nZWQgb3IgbmV3IGxpc3RlbmVycyBhZGRlZFxuICAgICAgICAgICAgICAgIGVsbS5hZGRFdmVudExpc3RlbmVyKG5hbWUsIGxpc3RlbmVyLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBmb3IgKG5hbWUgaW4gb24pIHtcbiAgICAgICAgICAgICAgICAvLyBhZGQgbGlzdGVuZXIgaWYgbmV3IGxpc3RlbmVyIGFkZGVkXG4gICAgICAgICAgICAgICAgaWYgKCFvbGRPbltuYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICBlbG0uYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBsaXN0ZW5lciwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbmV4cG9ydHMuZXZlbnRMaXN0ZW5lcnNNb2R1bGUgPSB7XG4gICAgY3JlYXRlOiB1cGRhdGVFdmVudExpc3RlbmVycyxcbiAgICB1cGRhdGU6IHVwZGF0ZUV2ZW50TGlzdGVuZXJzLFxuICAgIGRlc3Ryb3k6IHVwZGF0ZUV2ZW50TGlzdGVuZXJzXG59O1xuZXhwb3J0cy5kZWZhdWx0ID0gZXhwb3J0cy5ldmVudExpc3RlbmVyc01vZHVsZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWV2ZW50bGlzdGVuZXJzLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZnVuY3Rpb24gdXBkYXRlUHJvcHMob2xkVm5vZGUsIHZub2RlKSB7XG4gICAgdmFyIGtleSwgY3VyLCBvbGQsIGVsbSA9IHZub2RlLmVsbSwgb2xkUHJvcHMgPSBvbGRWbm9kZS5kYXRhLnByb3BzLCBwcm9wcyA9IHZub2RlLmRhdGEucHJvcHM7XG4gICAgaWYgKCFvbGRQcm9wcyAmJiAhcHJvcHMpXG4gICAgICAgIHJldHVybjtcbiAgICBpZiAob2xkUHJvcHMgPT09IHByb3BzKVxuICAgICAgICByZXR1cm47XG4gICAgb2xkUHJvcHMgPSBvbGRQcm9wcyB8fCB7fTtcbiAgICBwcm9wcyA9IHByb3BzIHx8IHt9O1xuICAgIGZvciAoa2V5IGluIG9sZFByb3BzKSB7XG4gICAgICAgIGlmICghcHJvcHNba2V5XSkge1xuICAgICAgICAgICAgZGVsZXRlIGVsbVtrZXldO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZvciAoa2V5IGluIHByb3BzKSB7XG4gICAgICAgIGN1ciA9IHByb3BzW2tleV07XG4gICAgICAgIG9sZCA9IG9sZFByb3BzW2tleV07XG4gICAgICAgIGlmIChvbGQgIT09IGN1ciAmJiAoa2V5ICE9PSAndmFsdWUnIHx8IGVsbVtrZXldICE9PSBjdXIpKSB7XG4gICAgICAgICAgICBlbG1ba2V5XSA9IGN1cjtcbiAgICAgICAgfVxuICAgIH1cbn1cbmV4cG9ydHMucHJvcHNNb2R1bGUgPSB7IGNyZWF0ZTogdXBkYXRlUHJvcHMsIHVwZGF0ZTogdXBkYXRlUHJvcHMgfTtcbmV4cG9ydHMuZGVmYXVsdCA9IGV4cG9ydHMucHJvcHNNb2R1bGU7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1wcm9wcy5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbnZhciB2bm9kZV8xID0gcmVxdWlyZShcIi4vdm5vZGVcIik7XG52YXIgaXMgPSByZXF1aXJlKFwiLi9pc1wiKTtcbnZhciBodG1sZG9tYXBpXzEgPSByZXF1aXJlKFwiLi9odG1sZG9tYXBpXCIpO1xuZnVuY3Rpb24gaXNVbmRlZihzKSB7IHJldHVybiBzID09PSB1bmRlZmluZWQ7IH1cbmZ1bmN0aW9uIGlzRGVmKHMpIHsgcmV0dXJuIHMgIT09IHVuZGVmaW5lZDsgfVxudmFyIGVtcHR5Tm9kZSA9IHZub2RlXzEuZGVmYXVsdCgnJywge30sIFtdLCB1bmRlZmluZWQsIHVuZGVmaW5lZCk7XG5mdW5jdGlvbiBzYW1lVm5vZGUodm5vZGUxLCB2bm9kZTIpIHtcbiAgICByZXR1cm4gdm5vZGUxLmtleSA9PT0gdm5vZGUyLmtleSAmJiB2bm9kZTEuc2VsID09PSB2bm9kZTIuc2VsO1xufVxuZnVuY3Rpb24gaXNWbm9kZSh2bm9kZSkge1xuICAgIHJldHVybiB2bm9kZS5zZWwgIT09IHVuZGVmaW5lZDtcbn1cbmZ1bmN0aW9uIGNyZWF0ZUtleVRvT2xkSWR4KGNoaWxkcmVuLCBiZWdpbklkeCwgZW5kSWR4KSB7XG4gICAgdmFyIGksIG1hcCA9IHt9LCBrZXksIGNoO1xuICAgIGZvciAoaSA9IGJlZ2luSWR4OyBpIDw9IGVuZElkeDsgKytpKSB7XG4gICAgICAgIGNoID0gY2hpbGRyZW5baV07XG4gICAgICAgIGlmIChjaCAhPSBudWxsKSB7XG4gICAgICAgICAgICBrZXkgPSBjaC5rZXk7XG4gICAgICAgICAgICBpZiAoa2V5ICE9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgbWFwW2tleV0gPSBpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtYXA7XG59XG52YXIgaG9va3MgPSBbJ2NyZWF0ZScsICd1cGRhdGUnLCAncmVtb3ZlJywgJ2Rlc3Ryb3knLCAncHJlJywgJ3Bvc3QnXTtcbnZhciBoXzEgPSByZXF1aXJlKFwiLi9oXCIpO1xuZXhwb3J0cy5oID0gaF8xLmg7XG52YXIgdGh1bmtfMSA9IHJlcXVpcmUoXCIuL3RodW5rXCIpO1xuZXhwb3J0cy50aHVuayA9IHRodW5rXzEudGh1bms7XG5mdW5jdGlvbiBpbml0KG1vZHVsZXMsIGRvbUFwaSkge1xuICAgIHZhciBpLCBqLCBjYnMgPSB7fTtcbiAgICB2YXIgYXBpID0gZG9tQXBpICE9PSB1bmRlZmluZWQgPyBkb21BcGkgOiBodG1sZG9tYXBpXzEuZGVmYXVsdDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgaG9va3MubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgY2JzW2hvb2tzW2ldXSA9IFtdO1xuICAgICAgICBmb3IgKGogPSAwOyBqIDwgbW9kdWxlcy5sZW5ndGg7ICsraikge1xuICAgICAgICAgICAgdmFyIGhvb2sgPSBtb2R1bGVzW2pdW2hvb2tzW2ldXTtcbiAgICAgICAgICAgIGlmIChob29rICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBjYnNbaG9va3NbaV1dLnB1c2goaG9vayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gZW1wdHlOb2RlQXQoZWxtKSB7XG4gICAgICAgIHZhciBpZCA9IGVsbS5pZCA/ICcjJyArIGVsbS5pZCA6ICcnO1xuICAgICAgICB2YXIgYyA9IGVsbS5jbGFzc05hbWUgPyAnLicgKyBlbG0uY2xhc3NOYW1lLnNwbGl0KCcgJykuam9pbignLicpIDogJyc7XG4gICAgICAgIHJldHVybiB2bm9kZV8xLmRlZmF1bHQoYXBpLnRhZ05hbWUoZWxtKS50b0xvd2VyQ2FzZSgpICsgaWQgKyBjLCB7fSwgW10sIHVuZGVmaW5lZCwgZWxtKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gY3JlYXRlUm1DYihjaGlsZEVsbSwgbGlzdGVuZXJzKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBybUNiKCkge1xuICAgICAgICAgICAgaWYgKC0tbGlzdGVuZXJzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhcmVudF8xID0gYXBpLnBhcmVudE5vZGUoY2hpbGRFbG0pO1xuICAgICAgICAgICAgICAgIGFwaS5yZW1vdmVDaGlsZChwYXJlbnRfMSwgY2hpbGRFbG0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbiAgICBmdW5jdGlvbiBjcmVhdGVFbG0odm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSkge1xuICAgICAgICB2YXIgaSwgZGF0YSA9IHZub2RlLmRhdGE7XG4gICAgICAgIGlmIChkYXRhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGlmIChpc0RlZihpID0gZGF0YS5ob29rKSAmJiBpc0RlZihpID0gaS5pbml0KSkge1xuICAgICAgICAgICAgICAgIGkodm5vZGUpO1xuICAgICAgICAgICAgICAgIGRhdGEgPSB2bm9kZS5kYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IHZub2RlLmNoaWxkcmVuLCBzZWwgPSB2bm9kZS5zZWw7XG4gICAgICAgIGlmIChzZWwgPT09ICchJykge1xuICAgICAgICAgICAgaWYgKGlzVW5kZWYodm5vZGUudGV4dCkpIHtcbiAgICAgICAgICAgICAgICB2bm9kZS50ZXh0ID0gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2bm9kZS5lbG0gPSBhcGkuY3JlYXRlQ29tbWVudCh2bm9kZS50ZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzZWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gUGFyc2Ugc2VsZWN0b3JcbiAgICAgICAgICAgIHZhciBoYXNoSWR4ID0gc2VsLmluZGV4T2YoJyMnKTtcbiAgICAgICAgICAgIHZhciBkb3RJZHggPSBzZWwuaW5kZXhPZignLicsIGhhc2hJZHgpO1xuICAgICAgICAgICAgdmFyIGhhc2ggPSBoYXNoSWR4ID4gMCA/IGhhc2hJZHggOiBzZWwubGVuZ3RoO1xuICAgICAgICAgICAgdmFyIGRvdCA9IGRvdElkeCA+IDAgPyBkb3RJZHggOiBzZWwubGVuZ3RoO1xuICAgICAgICAgICAgdmFyIHRhZyA9IGhhc2hJZHggIT09IC0xIHx8IGRvdElkeCAhPT0gLTEgPyBzZWwuc2xpY2UoMCwgTWF0aC5taW4oaGFzaCwgZG90KSkgOiBzZWw7XG4gICAgICAgICAgICB2YXIgZWxtID0gdm5vZGUuZWxtID0gaXNEZWYoZGF0YSkgJiYgaXNEZWYoaSA9IGRhdGEubnMpID8gYXBpLmNyZWF0ZUVsZW1lbnROUyhpLCB0YWcpXG4gICAgICAgICAgICAgICAgOiBhcGkuY3JlYXRlRWxlbWVudCh0YWcpO1xuICAgICAgICAgICAgaWYgKGhhc2ggPCBkb3QpXG4gICAgICAgICAgICAgICAgZWxtLnNldEF0dHJpYnV0ZSgnaWQnLCBzZWwuc2xpY2UoaGFzaCArIDEsIGRvdCkpO1xuICAgICAgICAgICAgaWYgKGRvdElkeCA+IDApXG4gICAgICAgICAgICAgICAgZWxtLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCBzZWwuc2xpY2UoZG90ICsgMSkucmVwbGFjZSgvXFwuL2csICcgJykpO1xuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGNicy5jcmVhdGUubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgY2JzLmNyZWF0ZVtpXShlbXB0eU5vZGUsIHZub2RlKTtcbiAgICAgICAgICAgIGlmIChpcy5hcnJheShjaGlsZHJlbikpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNoID0gY2hpbGRyZW5baV07XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcGkuYXBwZW5kQ2hpbGQoZWxtLCBjcmVhdGVFbG0oY2gsIGluc2VydGVkVm5vZGVRdWV1ZSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaXMucHJpbWl0aXZlKHZub2RlLnRleHQpKSB7XG4gICAgICAgICAgICAgICAgYXBpLmFwcGVuZENoaWxkKGVsbSwgYXBpLmNyZWF0ZVRleHROb2RlKHZub2RlLnRleHQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGkgPSB2bm9kZS5kYXRhLmhvb2s7IC8vIFJldXNlIHZhcmlhYmxlXG4gICAgICAgICAgICBpZiAoaXNEZWYoaSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoaS5jcmVhdGUpXG4gICAgICAgICAgICAgICAgICAgIGkuY3JlYXRlKGVtcHR5Tm9kZSwgdm5vZGUpO1xuICAgICAgICAgICAgICAgIGlmIChpLmluc2VydClcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0ZWRWbm9kZVF1ZXVlLnB1c2godm5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdm5vZGUuZWxtID0gYXBpLmNyZWF0ZVRleHROb2RlKHZub2RlLnRleHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2bm9kZS5lbG07XG4gICAgfVxuICAgIGZ1bmN0aW9uIGFkZFZub2RlcyhwYXJlbnRFbG0sIGJlZm9yZSwgdm5vZGVzLCBzdGFydElkeCwgZW5kSWR4LCBpbnNlcnRlZFZub2RlUXVldWUpIHtcbiAgICAgICAgZm9yICg7IHN0YXJ0SWR4IDw9IGVuZElkeDsgKytzdGFydElkeCkge1xuICAgICAgICAgICAgdmFyIGNoID0gdm5vZGVzW3N0YXJ0SWR4XTtcbiAgICAgICAgICAgIGlmIChjaCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnRFbG0sIGNyZWF0ZUVsbShjaCwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKSwgYmVmb3JlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBpbnZva2VEZXN0cm95SG9vayh2bm9kZSkge1xuICAgICAgICB2YXIgaSwgaiwgZGF0YSA9IHZub2RlLmRhdGE7XG4gICAgICAgIGlmIChkYXRhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGlmIChpc0RlZihpID0gZGF0YS5ob29rKSAmJiBpc0RlZihpID0gaS5kZXN0cm95KSlcbiAgICAgICAgICAgICAgICBpKHZub2RlKTtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBjYnMuZGVzdHJveS5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICBjYnMuZGVzdHJveVtpXSh2bm9kZSk7XG4gICAgICAgICAgICBpZiAodm5vZGUuY2hpbGRyZW4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCB2bm9kZS5jaGlsZHJlbi5sZW5ndGg7ICsraikge1xuICAgICAgICAgICAgICAgICAgICBpID0gdm5vZGUuY2hpbGRyZW5bal07XG4gICAgICAgICAgICAgICAgICAgIGlmIChpICE9IG51bGwgJiYgdHlwZW9mIGkgIT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludm9rZURlc3Ryb3lIb29rKGkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlbW92ZVZub2RlcyhwYXJlbnRFbG0sIHZub2Rlcywgc3RhcnRJZHgsIGVuZElkeCkge1xuICAgICAgICBmb3IgKDsgc3RhcnRJZHggPD0gZW5kSWR4OyArK3N0YXJ0SWR4KSB7XG4gICAgICAgICAgICB2YXIgaV8xID0gdm9pZCAwLCBsaXN0ZW5lcnMgPSB2b2lkIDAsIHJtID0gdm9pZCAwLCBjaCA9IHZub2Rlc1tzdGFydElkeF07XG4gICAgICAgICAgICBpZiAoY2ggIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmIChpc0RlZihjaC5zZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGludm9rZURlc3Ryb3lIb29rKGNoKTtcbiAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXJzID0gY2JzLnJlbW92ZS5sZW5ndGggKyAxO1xuICAgICAgICAgICAgICAgICAgICBybSA9IGNyZWF0ZVJtQ2IoY2guZWxtLCBsaXN0ZW5lcnMpO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGlfMSA9IDA7IGlfMSA8IGNicy5yZW1vdmUubGVuZ3RoOyArK2lfMSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGNicy5yZW1vdmVbaV8xXShjaCwgcm0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNEZWYoaV8xID0gY2guZGF0YSkgJiYgaXNEZWYoaV8xID0gaV8xLmhvb2spICYmIGlzRGVmKGlfMSA9IGlfMS5yZW1vdmUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpXzEoY2gsIHJtKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJtKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGFwaS5yZW1vdmVDaGlsZChwYXJlbnRFbG0sIGNoLmVsbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIHVwZGF0ZUNoaWxkcmVuKHBhcmVudEVsbSwgb2xkQ2gsIG5ld0NoLCBpbnNlcnRlZFZub2RlUXVldWUpIHtcbiAgICAgICAgdmFyIG9sZFN0YXJ0SWR4ID0gMCwgbmV3U3RhcnRJZHggPSAwO1xuICAgICAgICB2YXIgb2xkRW5kSWR4ID0gb2xkQ2gubGVuZ3RoIC0gMTtcbiAgICAgICAgdmFyIG9sZFN0YXJ0Vm5vZGUgPSBvbGRDaFswXTtcbiAgICAgICAgdmFyIG9sZEVuZFZub2RlID0gb2xkQ2hbb2xkRW5kSWR4XTtcbiAgICAgICAgdmFyIG5ld0VuZElkeCA9IG5ld0NoLmxlbmd0aCAtIDE7XG4gICAgICAgIHZhciBuZXdTdGFydFZub2RlID0gbmV3Q2hbMF07XG4gICAgICAgIHZhciBuZXdFbmRWbm9kZSA9IG5ld0NoW25ld0VuZElkeF07XG4gICAgICAgIHZhciBvbGRLZXlUb0lkeDtcbiAgICAgICAgdmFyIGlkeEluT2xkO1xuICAgICAgICB2YXIgZWxtVG9Nb3ZlO1xuICAgICAgICB2YXIgYmVmb3JlO1xuICAgICAgICB3aGlsZSAob2xkU3RhcnRJZHggPD0gb2xkRW5kSWR4ICYmIG5ld1N0YXJ0SWR4IDw9IG5ld0VuZElkeCkge1xuICAgICAgICAgICAgaWYgKG9sZFN0YXJ0Vm5vZGUgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIG9sZFN0YXJ0Vm5vZGUgPSBvbGRDaFsrK29sZFN0YXJ0SWR4XTsgLy8gVm5vZGUgbWlnaHQgaGF2ZSBiZWVuIG1vdmVkIGxlZnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKG9sZEVuZFZub2RlID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBvbGRFbmRWbm9kZSA9IG9sZENoWy0tb2xkRW5kSWR4XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKG5ld1N0YXJ0Vm5vZGUgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIG5ld1N0YXJ0Vm5vZGUgPSBuZXdDaFsrK25ld1N0YXJ0SWR4XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKG5ld0VuZFZub2RlID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBuZXdFbmRWbm9kZSA9IG5ld0NoWy0tbmV3RW5kSWR4XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHNhbWVWbm9kZShvbGRTdGFydFZub2RlLCBuZXdTdGFydFZub2RlKSkge1xuICAgICAgICAgICAgICAgIHBhdGNoVm5vZGUob2xkU3RhcnRWbm9kZSwgbmV3U3RhcnRWbm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgICAgICAgICAgICBvbGRTdGFydFZub2RlID0gb2xkQ2hbKytvbGRTdGFydElkeF07XG4gICAgICAgICAgICAgICAgbmV3U3RhcnRWbm9kZSA9IG5ld0NoWysrbmV3U3RhcnRJZHhdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoc2FtZVZub2RlKG9sZEVuZFZub2RlLCBuZXdFbmRWbm9kZSkpIHtcbiAgICAgICAgICAgICAgICBwYXRjaFZub2RlKG9sZEVuZFZub2RlLCBuZXdFbmRWbm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgICAgICAgICAgICBvbGRFbmRWbm9kZSA9IG9sZENoWy0tb2xkRW5kSWR4XTtcbiAgICAgICAgICAgICAgICBuZXdFbmRWbm9kZSA9IG5ld0NoWy0tbmV3RW5kSWR4XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHNhbWVWbm9kZShvbGRTdGFydFZub2RlLCBuZXdFbmRWbm9kZSkpIHtcbiAgICAgICAgICAgICAgICBwYXRjaFZub2RlKG9sZFN0YXJ0Vm5vZGUsIG5ld0VuZFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICAgICAgICAgIGFwaS5pbnNlcnRCZWZvcmUocGFyZW50RWxtLCBvbGRTdGFydFZub2RlLmVsbSwgYXBpLm5leHRTaWJsaW5nKG9sZEVuZFZub2RlLmVsbSkpO1xuICAgICAgICAgICAgICAgIG9sZFN0YXJ0Vm5vZGUgPSBvbGRDaFsrK29sZFN0YXJ0SWR4XTtcbiAgICAgICAgICAgICAgICBuZXdFbmRWbm9kZSA9IG5ld0NoWy0tbmV3RW5kSWR4XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHNhbWVWbm9kZShvbGRFbmRWbm9kZSwgbmV3U3RhcnRWbm9kZSkpIHtcbiAgICAgICAgICAgICAgICBwYXRjaFZub2RlKG9sZEVuZFZub2RlLCBuZXdTdGFydFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICAgICAgICAgIGFwaS5pbnNlcnRCZWZvcmUocGFyZW50RWxtLCBvbGRFbmRWbm9kZS5lbG0sIG9sZFN0YXJ0Vm5vZGUuZWxtKTtcbiAgICAgICAgICAgICAgICBvbGRFbmRWbm9kZSA9IG9sZENoWy0tb2xkRW5kSWR4XTtcbiAgICAgICAgICAgICAgICBuZXdTdGFydFZub2RlID0gbmV3Q2hbKytuZXdTdGFydElkeF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAob2xkS2V5VG9JZHggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBvbGRLZXlUb0lkeCA9IGNyZWF0ZUtleVRvT2xkSWR4KG9sZENoLCBvbGRTdGFydElkeCwgb2xkRW5kSWR4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWR4SW5PbGQgPSBvbGRLZXlUb0lkeFtuZXdTdGFydFZub2RlLmtleV07XG4gICAgICAgICAgICAgICAgaWYgKGlzVW5kZWYoaWR4SW5PbGQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwaS5pbnNlcnRCZWZvcmUocGFyZW50RWxtLCBjcmVhdGVFbG0obmV3U3RhcnRWbm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKSwgb2xkU3RhcnRWbm9kZS5lbG0pO1xuICAgICAgICAgICAgICAgICAgICBuZXdTdGFydFZub2RlID0gbmV3Q2hbKytuZXdTdGFydElkeF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbG1Ub01vdmUgPSBvbGRDaFtpZHhJbk9sZF07XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbG1Ub01vdmUuc2VsICE9PSBuZXdTdGFydFZub2RlLnNlbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnRFbG0sIGNyZWF0ZUVsbShuZXdTdGFydFZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpLCBvbGRTdGFydFZub2RlLmVsbSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRjaFZub2RlKGVsbVRvTW92ZSwgbmV3U3RhcnRWbm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9sZENoW2lkeEluT2xkXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwaS5pbnNlcnRCZWZvcmUocGFyZW50RWxtLCBlbG1Ub01vdmUuZWxtLCBvbGRTdGFydFZub2RlLmVsbSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbmV3U3RhcnRWbm9kZSA9IG5ld0NoWysrbmV3U3RhcnRJZHhdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAob2xkU3RhcnRJZHggPD0gb2xkRW5kSWR4IHx8IG5ld1N0YXJ0SWR4IDw9IG5ld0VuZElkeCkge1xuICAgICAgICAgICAgaWYgKG9sZFN0YXJ0SWR4ID4gb2xkRW5kSWR4KSB7XG4gICAgICAgICAgICAgICAgYmVmb3JlID0gbmV3Q2hbbmV3RW5kSWR4ICsgMV0gPT0gbnVsbCA/IG51bGwgOiBuZXdDaFtuZXdFbmRJZHggKyAxXS5lbG07XG4gICAgICAgICAgICAgICAgYWRkVm5vZGVzKHBhcmVudEVsbSwgYmVmb3JlLCBuZXdDaCwgbmV3U3RhcnRJZHgsIG5ld0VuZElkeCwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlbW92ZVZub2RlcyhwYXJlbnRFbG0sIG9sZENoLCBvbGRTdGFydElkeCwgb2xkRW5kSWR4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBwYXRjaFZub2RlKG9sZFZub2RlLCB2bm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKSB7XG4gICAgICAgIHZhciBpLCBob29rO1xuICAgICAgICBpZiAoaXNEZWYoaSA9IHZub2RlLmRhdGEpICYmIGlzRGVmKGhvb2sgPSBpLmhvb2spICYmIGlzRGVmKGkgPSBob29rLnByZXBhdGNoKSkge1xuICAgICAgICAgICAgaShvbGRWbm9kZSwgdm5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBlbG0gPSB2bm9kZS5lbG0gPSBvbGRWbm9kZS5lbG07XG4gICAgICAgIHZhciBvbGRDaCA9IG9sZFZub2RlLmNoaWxkcmVuO1xuICAgICAgICB2YXIgY2ggPSB2bm9kZS5jaGlsZHJlbjtcbiAgICAgICAgaWYgKG9sZFZub2RlID09PSB2bm9kZSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaWYgKHZub2RlLmRhdGEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGNicy51cGRhdGUubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgY2JzLnVwZGF0ZVtpXShvbGRWbm9kZSwgdm5vZGUpO1xuICAgICAgICAgICAgaSA9IHZub2RlLmRhdGEuaG9vaztcbiAgICAgICAgICAgIGlmIChpc0RlZihpKSAmJiBpc0RlZihpID0gaS51cGRhdGUpKVxuICAgICAgICAgICAgICAgIGkob2xkVm5vZGUsIHZub2RlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNVbmRlZih2bm9kZS50ZXh0KSkge1xuICAgICAgICAgICAgaWYgKGlzRGVmKG9sZENoKSAmJiBpc0RlZihjaCkpIHtcbiAgICAgICAgICAgICAgICBpZiAob2xkQ2ggIT09IGNoKVxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVDaGlsZHJlbihlbG0sIG9sZENoLCBjaCwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGlzRGVmKGNoKSkge1xuICAgICAgICAgICAgICAgIGlmIChpc0RlZihvbGRWbm9kZS50ZXh0KSlcbiAgICAgICAgICAgICAgICAgICAgYXBpLnNldFRleHRDb250ZW50KGVsbSwgJycpO1xuICAgICAgICAgICAgICAgIGFkZFZub2RlcyhlbG0sIG51bGwsIGNoLCAwLCBjaC5sZW5ndGggLSAxLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaXNEZWYob2xkQ2gpKSB7XG4gICAgICAgICAgICAgICAgcmVtb3ZlVm5vZGVzKGVsbSwgb2xkQ2gsIDAsIG9sZENoLmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaXNEZWYob2xkVm5vZGUudGV4dCkpIHtcbiAgICAgICAgICAgICAgICBhcGkuc2V0VGV4dENvbnRlbnQoZWxtLCAnJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAob2xkVm5vZGUudGV4dCAhPT0gdm5vZGUudGV4dCkge1xuICAgICAgICAgICAgaWYgKGlzRGVmKG9sZENoKSkge1xuICAgICAgICAgICAgICAgIHJlbW92ZVZub2RlcyhlbG0sIG9sZENoLCAwLCBvbGRDaC5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFwaS5zZXRUZXh0Q29udGVudChlbG0sIHZub2RlLnRleHQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc0RlZihob29rKSAmJiBpc0RlZihpID0gaG9vay5wb3N0cGF0Y2gpKSB7XG4gICAgICAgICAgICBpKG9sZFZub2RlLCB2bm9kZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZ1bmN0aW9uIHBhdGNoKG9sZFZub2RlLCB2bm9kZSkge1xuICAgICAgICB2YXIgaSwgZWxtLCBwYXJlbnQ7XG4gICAgICAgIHZhciBpbnNlcnRlZFZub2RlUXVldWUgPSBbXTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGNicy5wcmUubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICBjYnMucHJlW2ldKCk7XG4gICAgICAgIGlmICghaXNWbm9kZShvbGRWbm9kZSkpIHtcbiAgICAgICAgICAgIG9sZFZub2RlID0gZW1wdHlOb2RlQXQob2xkVm5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzYW1lVm5vZGUob2xkVm5vZGUsIHZub2RlKSkge1xuICAgICAgICAgICAgcGF0Y2hWbm9kZShvbGRWbm9kZSwgdm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBlbG0gPSBvbGRWbm9kZS5lbG07XG4gICAgICAgICAgICBwYXJlbnQgPSBhcGkucGFyZW50Tm9kZShlbG0pO1xuICAgICAgICAgICAgY3JlYXRlRWxtKHZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgICAgICAgICAgaWYgKHBhcmVudCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGFwaS5pbnNlcnRCZWZvcmUocGFyZW50LCB2bm9kZS5lbG0sIGFwaS5uZXh0U2libGluZyhlbG0pKTtcbiAgICAgICAgICAgICAgICByZW1vdmVWbm9kZXMocGFyZW50LCBbb2xkVm5vZGVdLCAwLCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgaW5zZXJ0ZWRWbm9kZVF1ZXVlLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBpbnNlcnRlZFZub2RlUXVldWVbaV0uZGF0YS5ob29rLmluc2VydChpbnNlcnRlZFZub2RlUXVldWVbaV0pO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBjYnMucG9zdC5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgIGNicy5wb3N0W2ldKCk7XG4gICAgICAgIHJldHVybiB2bm9kZTtcbiAgICB9O1xufVxuZXhwb3J0cy5pbml0ID0gaW5pdDtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXNuYWJiZG9tLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xudmFyIGhfMSA9IHJlcXVpcmUoXCIuL2hcIik7XG5mdW5jdGlvbiBjb3B5VG9UaHVuayh2bm9kZSwgdGh1bmspIHtcbiAgICB0aHVuay5lbG0gPSB2bm9kZS5lbG07XG4gICAgdm5vZGUuZGF0YS5mbiA9IHRodW5rLmRhdGEuZm47XG4gICAgdm5vZGUuZGF0YS5hcmdzID0gdGh1bmsuZGF0YS5hcmdzO1xuICAgIHRodW5rLmRhdGEgPSB2bm9kZS5kYXRhO1xuICAgIHRodW5rLmNoaWxkcmVuID0gdm5vZGUuY2hpbGRyZW47XG4gICAgdGh1bmsudGV4dCA9IHZub2RlLnRleHQ7XG4gICAgdGh1bmsuZWxtID0gdm5vZGUuZWxtO1xufVxuZnVuY3Rpb24gaW5pdCh0aHVuaykge1xuICAgIHZhciBjdXIgPSB0aHVuay5kYXRhO1xuICAgIHZhciB2bm9kZSA9IGN1ci5mbi5hcHBseSh1bmRlZmluZWQsIGN1ci5hcmdzKTtcbiAgICBjb3B5VG9UaHVuayh2bm9kZSwgdGh1bmspO1xufVxuZnVuY3Rpb24gcHJlcGF0Y2gob2xkVm5vZGUsIHRodW5rKSB7XG4gICAgdmFyIGksIG9sZCA9IG9sZFZub2RlLmRhdGEsIGN1ciA9IHRodW5rLmRhdGE7XG4gICAgdmFyIG9sZEFyZ3MgPSBvbGQuYXJncywgYXJncyA9IGN1ci5hcmdzO1xuICAgIGlmIChvbGQuZm4gIT09IGN1ci5mbiB8fCBvbGRBcmdzLmxlbmd0aCAhPT0gYXJncy5sZW5ndGgpIHtcbiAgICAgICAgY29weVRvVGh1bmsoY3VyLmZuLmFwcGx5KHVuZGVmaW5lZCwgYXJncyksIHRodW5rKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7ICsraSkge1xuICAgICAgICBpZiAob2xkQXJnc1tpXSAhPT0gYXJnc1tpXSkge1xuICAgICAgICAgICAgY29weVRvVGh1bmsoY3VyLmZuLmFwcGx5KHVuZGVmaW5lZCwgYXJncyksIHRodW5rKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBjb3B5VG9UaHVuayhvbGRWbm9kZSwgdGh1bmspO1xufVxuZXhwb3J0cy50aHVuayA9IGZ1bmN0aW9uIHRodW5rKHNlbCwga2V5LCBmbiwgYXJncykge1xuICAgIGlmIChhcmdzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgYXJncyA9IGZuO1xuICAgICAgICBmbiA9IGtleTtcbiAgICAgICAga2V5ID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4gaF8xLmgoc2VsLCB7XG4gICAgICAgIGtleToga2V5LFxuICAgICAgICBob29rOiB7IGluaXQ6IGluaXQsIHByZXBhdGNoOiBwcmVwYXRjaCB9LFxuICAgICAgICBmbjogZm4sXG4gICAgICAgIGFyZ3M6IGFyZ3NcbiAgICB9KTtcbn07XG5leHBvcnRzLmRlZmF1bHQgPSBleHBvcnRzLnRodW5rO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dGh1bmsuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG52YXIgdm5vZGVfMSA9IHJlcXVpcmUoXCIuL3Zub2RlXCIpO1xudmFyIGh0bWxkb21hcGlfMSA9IHJlcXVpcmUoXCIuL2h0bWxkb21hcGlcIik7XG5mdW5jdGlvbiB0b1ZOb2RlKG5vZGUsIGRvbUFwaSkge1xuICAgIHZhciBhcGkgPSBkb21BcGkgIT09IHVuZGVmaW5lZCA/IGRvbUFwaSA6IGh0bWxkb21hcGlfMS5kZWZhdWx0O1xuICAgIHZhciB0ZXh0O1xuICAgIGlmIChhcGkuaXNFbGVtZW50KG5vZGUpKSB7XG4gICAgICAgIHZhciBpZCA9IG5vZGUuaWQgPyAnIycgKyBub2RlLmlkIDogJyc7XG4gICAgICAgIHZhciBjbiA9IG5vZGUuZ2V0QXR0cmlidXRlKCdjbGFzcycpO1xuICAgICAgICB2YXIgYyA9IGNuID8gJy4nICsgY24uc3BsaXQoJyAnKS5qb2luKCcuJykgOiAnJztcbiAgICAgICAgdmFyIHNlbCA9IGFwaS50YWdOYW1lKG5vZGUpLnRvTG93ZXJDYXNlKCkgKyBpZCArIGM7XG4gICAgICAgIHZhciBhdHRycyA9IHt9O1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSBbXTtcbiAgICAgICAgdmFyIG5hbWVfMTtcbiAgICAgICAgdmFyIGkgPSB2b2lkIDAsIG4gPSB2b2lkIDA7XG4gICAgICAgIHZhciBlbG1BdHRycyA9IG5vZGUuYXR0cmlidXRlcztcbiAgICAgICAgdmFyIGVsbUNoaWxkcmVuID0gbm9kZS5jaGlsZE5vZGVzO1xuICAgICAgICBmb3IgKGkgPSAwLCBuID0gZWxtQXR0cnMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICBuYW1lXzEgPSBlbG1BdHRyc1tpXS5ub2RlTmFtZTtcbiAgICAgICAgICAgIGlmIChuYW1lXzEgIT09ICdpZCcgJiYgbmFtZV8xICE9PSAnY2xhc3MnKSB7XG4gICAgICAgICAgICAgICAgYXR0cnNbbmFtZV8xXSA9IGVsbUF0dHJzW2ldLm5vZGVWYWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwLCBuID0gZWxtQ2hpbGRyZW4ubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICBjaGlsZHJlbi5wdXNoKHRvVk5vZGUoZWxtQ2hpbGRyZW5baV0sIGRvbUFwaSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2bm9kZV8xLmRlZmF1bHQoc2VsLCB7IGF0dHJzOiBhdHRycyB9LCBjaGlsZHJlbiwgdW5kZWZpbmVkLCBub2RlKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoYXBpLmlzVGV4dChub2RlKSkge1xuICAgICAgICB0ZXh0ID0gYXBpLmdldFRleHRDb250ZW50KG5vZGUpO1xuICAgICAgICByZXR1cm4gdm5vZGVfMS5kZWZhdWx0KHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHRleHQsIG5vZGUpO1xuICAgIH1cbiAgICBlbHNlIGlmIChhcGkuaXNDb21tZW50KG5vZGUpKSB7XG4gICAgICAgIHRleHQgPSBhcGkuZ2V0VGV4dENvbnRlbnQobm9kZSk7XG4gICAgICAgIHJldHVybiB2bm9kZV8xLmRlZmF1bHQoJyEnLCB7fSwgW10sIHRleHQsIG5vZGUpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHZub2RlXzEuZGVmYXVsdCgnJywge30sIFtdLCB1bmRlZmluZWQsIG5vZGUpO1xuICAgIH1cbn1cbmV4cG9ydHMudG9WTm9kZSA9IHRvVk5vZGU7XG5leHBvcnRzLmRlZmF1bHQgPSB0b1ZOb2RlO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dG92bm9kZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmZ1bmN0aW9uIHZub2RlKHNlbCwgZGF0YSwgY2hpbGRyZW4sIHRleHQsIGVsbSkge1xuICAgIHZhciBrZXkgPSBkYXRhID09PSB1bmRlZmluZWQgPyB1bmRlZmluZWQgOiBkYXRhLmtleTtcbiAgICByZXR1cm4geyBzZWw6IHNlbCwgZGF0YTogZGF0YSwgY2hpbGRyZW46IGNoaWxkcmVuLFxuICAgICAgICB0ZXh0OiB0ZXh0LCBlbG06IGVsbSwga2V5OiBrZXkgfTtcbn1cbmV4cG9ydHMudm5vZGUgPSB2bm9kZTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZub2RlO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dm5vZGUuanMubWFwIiwiZnVuY3Rpb24gbm9vcCgpIHt9XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHVybCwgb3B0cykge1xuXHRvcHRzID0gb3B0cyB8fCB7fTtcblxuXHR2YXIgd3MsIG51bT0wLCB0aW1lcj0xLCAkPXt9O1xuXHR2YXIgbWF4ID0gb3B0cy5tYXhBdHRlbXB0cyB8fCBJbmZpbml0eTtcblxuXHQkLm9wZW4gPSBmdW5jdGlvbiAoKSB7XG5cdFx0d3MgPSBuZXcgV2ViU29ja2V0KHVybCwgb3B0cy5wcm90b2NvbHMgfHwgW10pO1xuXG5cdFx0d3Mub25tZXNzYWdlID0gb3B0cy5vbm1lc3NhZ2UgfHwgbm9vcDtcblxuXHRcdHdzLm9ub3BlbiA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHQob3B0cy5vbm9wZW4gfHwgbm9vcCkoZSk7XG5cdFx0XHRudW0gPSAwO1xuXHRcdH07XG5cblx0XHR3cy5vbmNsb3NlID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdGUuY29kZSA9PT0gMWUzIHx8IGUuY29kZSA9PT0gMTAwMSB8fCBlLmNvZGUgPT09IDEwMDUgfHwgJC5yZWNvbm5lY3QoZSk7XG5cdFx0XHQob3B0cy5vbmNsb3NlIHx8IG5vb3ApKGUpO1xuXHRcdH07XG5cblx0XHR3cy5vbmVycm9yID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdChlICYmIGUuY29kZT09PSdFQ09OTlJFRlVTRUQnKSA/ICQucmVjb25uZWN0KGUpIDogKG9wdHMub25lcnJvciB8fCBub29wKShlKTtcblx0XHR9O1xuXHR9O1xuXG5cdCQucmVjb25uZWN0ID0gZnVuY3Rpb24gKGUpIHtcblx0XHRpZiAodGltZXIgJiYgbnVtKysgPCBtYXgpIHtcblx0XHRcdHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdChvcHRzLm9ucmVjb25uZWN0IHx8IG5vb3ApKGUpO1xuXHRcdFx0XHQkLm9wZW4oKTtcblx0XHRcdH0sIG9wdHMudGltZW91dCB8fCAxZTMpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQob3B0cy5vbm1heGltdW0gfHwgbm9vcCkoZSk7XG5cdFx0fVxuXHR9O1xuXG5cdCQuanNvbiA9IGZ1bmN0aW9uICh4KSB7XG5cdFx0d3Muc2VuZChKU09OLnN0cmluZ2lmeSh4KSk7XG5cdH07XG5cblx0JC5zZW5kID0gZnVuY3Rpb24gKHgpIHtcblx0XHR3cy5zZW5kKHgpO1xuXHR9O1xuXG5cdCQuY2xvc2UgPSBmdW5jdGlvbiAoeCwgeSkge1xuXHRcdHRpbWVyID0gY2xlYXJUaW1lb3V0KHRpbWVyKTtcblx0XHR3cy5jbG9zZSh4IHx8IDFlMywgeSk7XG5cdH07XG5cblx0JC5vcGVuKCk7IC8vIGluaXRcblxuXHRyZXR1cm4gJDtcbn1cbiIsImltcG9ydCBoIGZyb20gJ3NuYWJiZG9tL2gnO1xuaW1wb3J0IHsgVk5vZGUgfSBmcm9tICdzbmFiYmRvbS92bm9kZSc7XG5cbmltcG9ydCB7IHJlbmRlclVzZXJuYW1lIH0gZnJvbSAnLi91c2VyJztcblxuXG5leHBvcnQgZnVuY3Rpb24gYWJvdXRWaWV3KG1vZGVsKTogVk5vZGVbXSB7XG4gICAgcmVuZGVyVXNlcm5hbWUobW9kZWxbXCJob21lXCJdLCBtb2RlbFtcInVzZXJuYW1lXCJdKTtcblxuICAgIGNvbnNvbGUubG9nKG1vZGVsKTtcbiAgICByZXR1cm4gW2goJ2FzaWRlLnNpZGViYXItZmlyc3QnKSxcbiAgICAgICAgICAgIGgoJ21haW4ubWFpbicsIFtcbiAgICAgICAgICAgICAgICBoKCdkaXYuYWJvdXQnLCBbXG4gICAgICAgICAgICAgICAgICAgIGgoJ2gyJywgXCJBYm91dCBweWNoZXNzLXZhcmlhbnRzXCIpLFxuICAgICAgICAgICAgICAgICAgICBoKCdwJywgXCJweWNoZXNzLXZhcmlhbnRzIGlzIGEgZnJlZSwgb3Blbi1zb3VyY2UgY2hlc3Mgc2VydmVyIGRlc2lnbmVkIHRvIHBsYXkgc2V2ZXJhbCBjaGVzcyB2YXJpYW50LlwiKSxcbiAgICAgICAgICAgICAgICAgICAgaCgncCcsIFtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiQ3VycmVudGx5IHN1cHBvcnRlZCBnYW1lcyBhcmUgXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBoKCdhJywge2F0dHJzOiB7aHJlZjogJ2h0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL01ha3J1ayd9fSwgJ01ha3J1aycpLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCIsIFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgaCgnYScsIHthdHRyczoge2hyZWY6ICdodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9TaXR0dXlpbid9fSwgJ1NpdHR1eWluJyksXG4gICAgICAgICAgICAgICAgICAgICAgICBcIiwgXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBoKCdhJywge2F0dHJzOiB7aHJlZjogJ2h0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1Nob2dpJ319LCAnU2hvZ2knKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiLCBcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2EnLCB7YXR0cnM6IHtocmVmOiAnaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvWGlhbmdxaSd9fSwgJ1hpYW5ncWknKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiLCBcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2EnLCB7YXR0cnM6IHtocmVmOiAnaHR0cDovL3d3dy5xdWFudHVtZ2FtYml0ei5jb20vYmxvZy9jaGVzcy9jZ2EvYnJvbnN0ZWluLWNoZXNzLXByZS1jaGVzcy1zaHVmZmxlLWNoZXNzJ319LCAnUGxhY2VtZW50JyksXG4gICAgICAgICAgICAgICAgICAgICAgICBcIiwgXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBoKCdhJywge2F0dHJzOiB7aHJlZjogJ2h0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0NyYXp5aG91c2UnfX0sICdDcmF6eWhvdXNlJyksXG4gICAgICAgICAgICAgICAgICAgICAgICBcIiwgXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBoKCdhJywge2F0dHJzOiB7aHJlZjogJ2h0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1NlaXJhd2FuX0NoZXNzJ319LCAnU2VpcmF3YW4nKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiLCBcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2EnLCB7YXR0cnM6IHtocmVmOiAnaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQ2FwYWJsYW5jYV9DaGVzcyd9fSwgJ0NhcGFibGFuY2EnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiLCBcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2EnLCB7YXR0cnM6IHtocmVmOiAnaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvR3JhbmRfQ2hlc3MnfX0sICdHcmFuZCBjaGVzcycpLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCIsIFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgaCgnYScsIHthdHRyczoge2hyZWY6ICdodHRwczovL3B5Y2hlc3MtdmFyaWFudHMuaGVyb2t1YXBwLmNvbS9JUlZ4TUc3Mid9fSwgJ1Nob3VzZSAoU2VpcmF3YW4rQ3Jhenlob3VzZSknKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiLCBcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2EnLCB7YXR0cnM6IHtocmVmOiAnaHR0cHM6Ly93d3cudHdpdGNoLnR2L3ZpZGVvcy80NjYyNTM4MTUnfX0sICdDYXBhaG91c2UgKENhcGFibGFuY2ErQ3Jhenlob3VzZSknKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiLCBcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2EnLCB7YXR0cnM6IHtocmVmOiAnaHR0cHM6Ly93d3cudHdpdGNoLnR2L3ZpZGVvcy80NzY4NTkyNzMnfX0sICdHcmFuZGhvdXNlIChHcmFuZCtDcmF6eWhvdXNlKScpLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCIgYW5kIHN0YW5kYXJkIFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgaCgnYScsIHthdHRyczoge2hyZWY6ICdodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9DaGVzcyd9fSwgJ0NoZXNzLicpLFxuICAgICAgICAgICAgICAgICAgICBdKSxcbiAgICAgICAgICAgICAgICAgICAgaCgncCcsIFsnQWRkaXRpb25hbGx5IHlvdSBjYW4gY2hlY2sgQ2hlc3M5NjAgb3B0aW9uIGluIGZvciBTdGFuZGFyZCwgQ3Jhenlob3VzZSwgQ2FwYWJsYW5jYSBhbmQgQ2FwYWhvdXNlIHRvIHN0YXJ0IGdhbWVzIGZyb20gcmFuZG9tIHBvc2l0aW9ucyB3aXRoICcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnYScsIHthdHRyczoge2hyZWY6ICdodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9DaGVzczk2MCNDYXN0bGluZ19ydWxlcyd9fSwgJ0NoZXNzOTYwIGNhc3RsaW5nIHJ1bGVzLicpXG4gICAgICAgICAgICAgICAgICAgICAgICBdKSxcbiAgICAgICAgICAgICAgICAgICAgaCgncCcsIFtcbiAgICAgICAgICAgICAgICAgICAgICAgICdGb3IgbW92ZSBnZW5lcmF0aW9uLCB2YWxpZGF0aW9uIGFuZCBlbmdpbmUgcGxheSBpdCB1c2VzICcsXG4gICAgICAgICAgICAgICAgICAgICAgICBoKCdhJywge2F0dHJzOiB7aHJlZjogJ2h0dHBzOi8vZ2l0aHViLmNvbS9nYnRhbWkvRmFpcnktU3RvY2tmaXNoJ319LCAnRmFpcnktU3RvY2tmaXNoJyksXG4gICAgICAgICAgICAgICAgICAgICAgICBcIiwgXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBoKCdhJywge2F0dHJzOiB7aHJlZjogJ2h0dHBzOi8vZ2l0aHViLmNvbS94cWJhc2UvZWxlZXllJ319LCAnRWxlcGhhbnRFeWUnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiLCBcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2EnLCB7YXR0cnM6IHtocmVmOiAnaHR0cHM6Ly9naXRodWIuY29tL3dhbGtlcjgwODgvbW9vbmZpc2gnfX0sICdtb29uZmlzaCcpLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCIgYW5kIFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgaCgnYScsIHthdHRyczoge2hyZWY6ICdodHRwczovL2dpdGh1Yi5jb20vZ2J0YW1pL2xpY2hlc3MtYm90LXZhcmlhbnRzJ319LCAnbGljaGVzcy1ib3QtdmFyaWFudHMuJyksXG4gICAgICAgICAgICAgICAgICAgIF0pLFxuICAgICAgICAgICAgICAgICAgICBoKCdwJywgW1xuICAgICAgICAgICAgICAgICAgICAgICAgJ09uIGNsaWVudCBzaWRlIGl0IGlzIGJhc2VkIG9uICcsXG4gICAgICAgICAgICAgICAgICAgICAgICBoKCdhJywge2F0dHJzOiB7aHJlZjogJ2h0dHBzOi8vZ2l0aHViLmNvbS9nYnRhbWkvY2hlc3Nncm91bmR4J319LCAnY2hlc3Nncm91bmR4LicpLFxuICAgICAgICAgICAgICAgICAgICBdKSxcbiAgICAgICAgICAgICAgICAgICAgaCgncCcsIFtcbiAgICAgICAgICAgICAgICAgICAgICAgICdTb3VyY2UgY29kZSBvZiBzZXJ2ZXIgaXMgYXZhaWxhYmxlIGF0ICcsXG4gICAgICAgICAgICAgICAgICAgICAgICBoKCdhJywge2F0dHJzOiB7aHJlZjogJ2h0dHBzOi8vZ2l0aHViLmNvbS9nYnRhbWkvcHljaGVzcy12YXJpYW50cyd9fSwgJ0dpdEh1Yi4nKSxcbiAgICAgICAgICAgICAgICAgICAgXSksXG4gICAgICAgICAgICAgICAgXSksXG4gICAgICAgICAgICBoKCdhc2lkZS5zaWRlYmFyLXNlY29uZCcpLFxuICAgICAgICAgICAgXSksXG4gICAgICAgIF07XG59IiwiaW1wb3J0IHsgaCB9IGZyb20gXCJzbmFiYmRvbVwiO1xyXG5pbXBvcnQgeyBWTm9kZSB9IGZyb20gJ3NuYWJiZG9tL3Zub2RlJztcclxuXHJcbmltcG9ydCBBbmFseXNpc0NvbnRyb2xsZXIgZnJvbSAnLi9hbmFseXNpc0N0cmwnO1xyXG5pbXBvcnQgeyBWQVJJQU5UUyB9IGZyb20gJy4vY2hlc3MnO1xyXG5pbXBvcnQgeyB0aW1lYWdvLCByZW5kZXJUaW1lYWdvIH0gZnJvbSAnLi9jbG9jayc7XHJcblxyXG5cclxuZnVuY3Rpb24gcnVuR3JvdW5kKHZub2RlOiBWTm9kZSwgbW9kZWwpIHtcclxuICAgIGNvbnN0IGVsID0gdm5vZGUuZWxtIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgY29uc3QgY3RybCA9IG5ldyBBbmFseXNpc0NvbnRyb2xsZXIoZWwsIG1vZGVsKTtcclxuICAgIGNvbnN0IGNnID0gY3RybC5jaGVzc2dyb3VuZDtcclxuICAgIHdpbmRvd1snY2cnXSA9IGNnO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYW5hbHlzaXNWaWV3KG1vZGVsKTogVk5vZGVbXSB7XHJcbiAgICBjb25zb2xlLmxvZyhcImFuYWx5c2lzVmlldyBtb2RlbD1cIiwgbW9kZWwpO1xyXG4gICAgY29uc3QgZGF0YUljb24gPSBWQVJJQU5UU1ttb2RlbFtcInZhcmlhbnRcIl1dLmljb247XHJcbiAgICByZW5kZXJUaW1lYWdvKCk7XHJcbiAgICByZXR1cm4gW2goJ2FzaWRlLnNpZGViYXItZmlyc3QnLCBbXHJcbiAgICAgICAgICAgICAgICBoKCdkaXYuZ2FtZS1pbmZvJywgW1xyXG4gICAgICAgICAgICAgICAgICAgIGgoJ2Rpdi5pbmZvMCcsIHthdHRyczoge1wiZGF0YS1pY29uXCI6IGRhdGFJY29ufSwgY2xhc3M6IHtcImljb25cIjogdHJ1ZX19LCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2Rpdi5pbmZvMScsIHthdHRyczoge1wiZGF0YS1pY29uXCI6IChtb2RlbFtcImNoZXNzOTYwXCJdID09PSAnVHJ1ZScpID8gXCJWXCIgOiBcIlwifSwgY2xhc3M6IHtcImljb25cIjogdHJ1ZX19KSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaCgnZGl2LmluZm8yJywgW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnZGl2LnRjJywgbW9kZWxbXCJiYXNlXCJdICsgXCIrXCIgKyBtb2RlbFtcImluY1wiXSArIFwiIOKAoiBDYXN1YWwg4oCiIFwiICsgbW9kZWxbXCJ2YXJpYW50XCJdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIE51bWJlcihtb2RlbFtcInN0YXR1c1wiXSkgPj0gMCA/IGgoJ2luZm8tZGF0ZScsIHthdHRyczoge3RpbWVzdGFtcDogbW9kZWxbXCJkYXRlXCJdfX0sIHRpbWVhZ28obW9kZWxbXCJkYXRlXCJdKSkgOiBcIlBsYXlpbmcgcmlnaHQgbm93XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICAgICAgICAgIGgoJ2Rpdi5wbGF5ZXItZGF0YScsIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaCgnaS1zaWRlLm9ubGluZScsIHtjbGFzczoge1wiaWNvblwiOiB0cnVlLCBcImljb24td2hpdGVcIjogdHJ1ZX0gfSApLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBoKCdwbGF5ZXInLCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoKCdhLnVzZXItbGluaycsIHthdHRyczoge2hyZWY6ICcvQC8nICsgbW9kZWxbXCJ3cGxheWVyXCJdfX0sIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoKCdwbGF5ZXItdGl0bGUnLCBcIiBcIiArIG1vZGVsW1wid3RpdGxlXCJdICsgXCIgXCIpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZGVsW1wid3BsYXllclwiXSArIFwiICgxNTAwPylcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgICAgICAgICBoKCdkaXYucGxheWVyLWRhdGEnLCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2ktc2lkZS5vbmxpbmUnLCB7Y2xhc3M6IHtcImljb25cIjogdHJ1ZSwgXCJpY29uLWJsYWNrXCI6IHRydWV9IH0gKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaCgncGxheWVyJywgW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnYS51c2VyLWxpbmsnLCB7YXR0cnM6IHtocmVmOiAnL0AvJyArIG1vZGVsW1wiYnBsYXllclwiXX19LCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgncGxheWVyLXRpdGxlJywgXCIgXCIgKyBtb2RlbFtcImJ0aXRsZVwiXSArIFwiIFwiKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2RlbFtcImJwbGF5ZXJcIl0gKyBcIiAoMTUwMD8pXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgICAgIGgoJ2Rpdi5yb3VuZGNoYXQjcm91bmRjaGF0JyksXHJcbiAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICBoKCdtYWluLm1haW4nLCBbXHJcbiAgICAgICAgICAgICAgICBoKCdzZWxlY3Rpb24uJyArIFZBUklBTlRTW21vZGVsW1widmFyaWFudFwiXV0uYm9hcmQgKyAnLicgKyBWQVJJQU5UU1ttb2RlbFtcInZhcmlhbnRcIl1dLnBpZWNlcywgW1xyXG4gICAgICAgICAgICAgICAgICAgIGgoJ2Rpdi5jZy13cmFwLicgKyBWQVJJQU5UU1ttb2RlbFtcInZhcmlhbnRcIl1dLmNnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7IGhvb2s6IHsgaW5zZXJ0OiAodm5vZGUpID0+IHJ1bkdyb3VuZCh2bm9kZSwgbW9kZWwpfSxcclxuICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgaCgnYXNpZGUuc2lkZWJhci1zZWNvbmQnLCBbXHJcbiAgICAgICAgICAgICAgICBoKCdkaXYjcG9ja2V0LXdyYXBwZXInLCBbXHJcbiAgICAgICAgICAgICAgICAgICAgaCgnZGl2LicgKyBWQVJJQU5UU1ttb2RlbFtcInZhcmlhbnRcIl1dLnBpZWNlcyArICcuJyArIG1vZGVsW1widmFyaWFudFwiXSwgW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBoKCdkaXYuY2ctd3JhcC5wb2NrZXQnLCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoKCdkaXYjcG9ja2V0MCcpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICAgICAgaCgnZGl2LnJvdW5kLWRhdGEnLCBbXHJcbiAgICAgICAgICAgICAgICAgICAgaCgnZGl2I21vdmUtY29udHJvbHMnKSxcclxuICAgICAgICAgICAgICAgICAgICBoKCdkaXYjYm9hcmQtc2V0dGluZ3MnKSxcclxuICAgICAgICAgICAgICAgICAgICBoKCdkaXYjbW92ZWxpc3QtYmxvY2snLCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2RpdiNtb3ZlbGlzdCcpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBoKCdkaXYjcmVzdWx0JyksXHJcbiAgICAgICAgICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgICAgIGgoJ2RpdiNwb2NrZXQtd3JhcHBlcicsIFtcclxuICAgICAgICAgICAgICAgICAgICBoKCdkaXYuJyArIFZBUklBTlRTW21vZGVsW1widmFyaWFudFwiXV0ucGllY2VzICsgJy4nICsgbW9kZWxbXCJ2YXJpYW50XCJdLCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2Rpdi5jZy13cmFwLnBvY2tldCcsIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2RpdiNwb2NrZXQxJyksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgICAgICBoKCdkaXYjZmxpcCcpLFxyXG4gICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgaCgndW5kZXItbGVmdCcsIFwiU3BlY3RhdG9yc1wiKSxcclxuICAgICAgICAgICAgaCgndW5kZXItYm9hcmQnLCBbXHJcbiAgICAgICAgICAgICAgICBoKCdkaXYuI3BnbicpXHJcbiAgICAgICAgICAgIF0pXHJcbiAgICAgICAgXTtcclxufVxyXG4iLCJpbXBvcnQgU29ja2V0dGUgZnJvbSAnc29ja2V0dGUnO1xyXG5cclxuaW1wb3J0IHsgaW5pdCB9IGZyb20gJ3NuYWJiZG9tJztcclxuaW1wb3J0IHsgaCB9IGZyb20gJ3NuYWJiZG9tL2gnO1xyXG5pbXBvcnQga2xhc3MgZnJvbSAnc25hYmJkb20vbW9kdWxlcy9jbGFzcyc7XHJcbmltcG9ydCBhdHRyaWJ1dGVzIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvYXR0cmlidXRlcyc7XHJcbmltcG9ydCBwcm9wZXJ0aWVzIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvcHJvcHMnO1xyXG5pbXBvcnQgbGlzdGVuZXJzIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvZXZlbnRsaXN0ZW5lcnMnO1xyXG5cclxuaW1wb3J0IHsga2V5MnBvcywgcG9zMmtleSB9IGZyb20gJ2NoZXNzZ3JvdW5keC91dGlsJztcclxuaW1wb3J0IHsgQ2hlc3Nncm91bmQgfSBmcm9tICdjaGVzc2dyb3VuZHgnO1xyXG5pbXBvcnQgeyBBcGkgfSBmcm9tICdjaGVzc2dyb3VuZHgvYXBpJztcclxuaW1wb3J0IHsgQ29sb3IsIERlc3RzLCBQaWVjZXNEaWZmLCBSb2xlLCBLZXksIFBvcywgUGllY2UgfSBmcm9tICdjaGVzc2dyb3VuZHgvdHlwZXMnO1xyXG5cclxuaW1wb3J0IG1ha2VHYXRpbmcgZnJvbSAnLi9nYXRpbmcnO1xyXG5pbXBvcnQgbWFrZVByb21vdGlvbiBmcm9tICcuL3Byb21vdGlvbic7XHJcbmltcG9ydCB7IGRyb3BJc1ZhbGlkLCBwb2NrZXRWaWV3LCB1cGRhdGVQb2NrZXRzIH0gZnJvbSAnLi9wb2NrZXQnO1xyXG5pbXBvcnQgeyBzb3VuZCB9IGZyb20gJy4vc291bmQnO1xyXG5pbXBvcnQgeyB2YXJpYW50cywgaGFzRXAsIG5lZWRQb2NrZXRzLCByb2xlVG9TYW4sIHVjaTJ1c2ksIHVzaTJ1Y2ksIGdyYW5kMnplcm8sIHplcm8yZ3JhbmQsIFZBUklBTlRTIH0gZnJvbSAnLi9jaGVzcyc7XHJcbmltcG9ydCB7IGNoYXRNZXNzYWdlLCBjaGF0VmlldyB9IGZyb20gJy4vY2hhdCc7XHJcbmltcG9ydCB7IHNldHRpbmdzVmlldyB9IGZyb20gJy4vc2V0dGluZ3MnO1xyXG5pbXBvcnQgeyBtb3ZlbGlzdFZpZXcsIHVwZGF0ZU1vdmVsaXN0LCBzZWxlY3RNb3ZlIH0gZnJvbSAnLi9tb3ZlbGlzdCc7XHJcbmltcG9ydCByZXNpemVIYW5kbGUgZnJvbSAnLi9yZXNpemUnO1xyXG5pbXBvcnQgeyByZXN1bHQgfSBmcm9tICcuL3Byb2ZpbGUnXHJcblxyXG5jb25zdCBwYXRjaCA9IGluaXQoW2tsYXNzLCBhdHRyaWJ1dGVzLCBwcm9wZXJ0aWVzLCBsaXN0ZW5lcnNdKTtcclxuXHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBbmFseXNpc0NvbnRyb2xsZXIge1xyXG4gICAgbW9kZWw7XHJcbiAgICBzb2NrO1xyXG4gICAgY2hlc3Nncm91bmQ6IEFwaTtcclxuICAgIGZ1bGxmZW46IHN0cmluZztcclxuICAgIHdwbGF5ZXI6IHN0cmluZztcclxuICAgIGJwbGF5ZXI6IHN0cmluZztcclxuICAgIGJhc2U6IG51bWJlcjtcclxuICAgIGluYzogbnVtYmVyO1xyXG4gICAgbXljb2xvcjogQ29sb3I7XHJcbiAgICBvcHBjb2xvcjogQ29sb3I7XHJcbiAgICB0dXJuQ29sb3I6IENvbG9yO1xyXG4gICAgZ2FtZUlkOiBzdHJpbmc7XHJcbiAgICB2YXJpYW50OiBzdHJpbmc7XHJcbiAgICBwb2NrZXRzOiBhbnk7XHJcbiAgICB2cG9ja2V0MDogYW55O1xyXG4gICAgdnBvY2tldDE6IGFueTtcclxuICAgIHZwbGF5ZXIwOiBhbnk7XHJcbiAgICB2cGxheWVyMTogYW55O1xyXG4gICAgdnBuZzogYW55O1xyXG4gICAgZ2FtZUNvbnRyb2xzOiBhbnk7XHJcbiAgICBtb3ZlQ29udHJvbHM6IGFueTtcclxuICAgIGdhdGluZzogYW55O1xyXG4gICAgcHJvbW90aW9uOiBhbnk7XHJcbiAgICBkZXN0czogRGVzdHM7XHJcbiAgICBwcm9tb3Rpb25zOiBzdHJpbmdbXTtcclxuICAgIGxhc3Rtb3ZlOiBLZXlbXTtcclxuICAgIHJlc3VsdDogc3RyaW5nO1xyXG4gICAgZmxpcDogYm9vbGVhbjtcclxuICAgIHNwZWN0YXRvcjogYm9vbGVhbjtcclxuICAgIHNldHRpbmdzOiBib29sZWFuO1xyXG4gICAgc3RhdHVzOiBudW1iZXI7XHJcbiAgICBzdGVwcztcclxuICAgIHBnbjogc3RyaW5nO1xyXG4gICAgcGx5OiBudW1iZXI7XHJcbiAgICBwbGF5ZXJzOiBzdHJpbmdbXTtcclxuICAgIHRpdGxlczogc3RyaW5nW107XHJcbiAgICBDU1NpbmRleGVzQjogbnVtYmVyW107XHJcbiAgICBDU1NpbmRleGVzUDogbnVtYmVyW107XHJcbiAgICBjbGlja0Ryb3A6IFBpZWNlIHwgdW5kZWZpbmVkO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGVsLCBtb2RlbCkge1xyXG4gICAgICAgIGNvbnN0IG9uT3BlbiA9IChldnQpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJjdHJsLm9uT3BlbigpXCIsIGV2dCk7XHJcbiAgICAgICAgICAgIHRoaXMuZG9TZW5kKHsgdHlwZTogXCJnYW1lX3VzZXJfY29ubmVjdGVkXCIsIHVzZXJuYW1lOiB0aGlzLm1vZGVsW1widXNlcm5hbWVcIl0sIGdhbWVJZDogdGhpcy5tb2RlbFtcImdhbWVJZFwiXSB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBjb25zdCBvcHRzID0ge1xyXG4gICAgICAgICAgICBtYXhBdHRlbXB0czogMTAsXHJcbiAgICAgICAgICAgIG9ub3BlbjogZSA9PiBvbk9wZW4oZSksXHJcbiAgICAgICAgICAgIG9ubWVzc2FnZTogZSA9PiB0aGlzLm9uTWVzc2FnZShlKSxcclxuICAgICAgICAgICAgb25yZWNvbm5lY3Q6IGUgPT4gY29uc29sZS5sb2coJ1JlY29ubmVjdGluZyBpbiByb3VuZC4uLicsIGUpLFxyXG4gICAgICAgICAgICBvbm1heGltdW06IGUgPT4gY29uc29sZS5sb2coJ1N0b3AgQXR0ZW1wdGluZyEnLCBlKSxcclxuICAgICAgICAgICAgb25jbG9zZTogZSA9PiBjb25zb2xlLmxvZygnQ2xvc2VkIScsIGUpLFxyXG4gICAgICAgICAgICBvbmVycm9yOiBlID0+IGNvbnNvbGUubG9nKCdFcnJvcjonLCBlKSxcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgdGhpcy5zb2NrID0gbmV3IFNvY2tldHRlKFwid3M6Ly9cIiArIGxvY2F0aW9uLmhvc3QgKyBcIi93c3JcIiwgb3B0cyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhdGNoKGVycikge1xyXG4gICAgICAgICAgICB0aGlzLnNvY2sgPSBuZXcgU29ja2V0dGUoXCJ3c3M6Ly9cIiArIGxvY2F0aW9uLmhvc3QgKyBcIi93c3JcIiwgb3B0cyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLm1vZGVsID0gbW9kZWw7XHJcbiAgICAgICAgdGhpcy52YXJpYW50ID0gbW9kZWxbXCJ2YXJpYW50XCJdIGFzIHN0cmluZztcclxuICAgICAgICB0aGlzLmZ1bGxmZW4gPSBtb2RlbFtcImZlblwiXSBhcyBzdHJpbmc7XHJcbiAgICAgICAgdGhpcy53cGxheWVyID0gbW9kZWxbXCJ3cGxheWVyXCJdIGFzIHN0cmluZztcclxuICAgICAgICB0aGlzLmJwbGF5ZXIgPSBtb2RlbFtcImJwbGF5ZXJcIl0gYXMgc3RyaW5nO1xyXG4gICAgICAgIHRoaXMuYmFzZSA9IG1vZGVsW1wiYmFzZVwiXSBhcyBudW1iZXI7XHJcbiAgICAgICAgdGhpcy5pbmMgPSBtb2RlbFtcImluY1wiXSBhcyBudW1iZXI7XHJcbiAgICAgICAgdGhpcy5zdGF0dXMgPSBtb2RlbFtcInN0YXR1c1wiXSBhcyBudW1iZXI7XHJcbiAgICAgICAgdGhpcy5zdGVwcyA9IFtdO1xyXG4gICAgICAgIHRoaXMucGduID0gXCJcIjtcclxuICAgICAgICB0aGlzLnBseSA9IDA7XHJcblxyXG4gICAgICAgIHRoaXMuZmxpcCA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSB0cnVlO1xyXG4gICAgICAgIHRoaXMuQ1NTaW5kZXhlc0IgPSB2YXJpYW50cy5tYXAoKHZhcmlhbnQpID0+IGxvY2FsU3RvcmFnZVt2YXJpYW50ICsgXCJfYm9hcmRcIl0gPT09IHVuZGVmaW5lZCA/IDAgOiBOdW1iZXIobG9jYWxTdG9yYWdlW3ZhcmlhbnQgKyBcIl9ib2FyZFwiXSkpO1xyXG4gICAgICAgIHRoaXMuQ1NTaW5kZXhlc1AgPSB2YXJpYW50cy5tYXAoKHZhcmlhbnQpID0+IGxvY2FsU3RvcmFnZVt2YXJpYW50ICsgXCJfcGllY2VzXCJdID09PSB1bmRlZmluZWQgPyAwIDogTnVtYmVyKGxvY2FsU3RvcmFnZVt2YXJpYW50ICsgXCJfcGllY2VzXCJdKSk7XHJcblxyXG4gICAgICAgIHRoaXMuc3BlY3RhdG9yID0gdGhpcy5tb2RlbFtcInVzZXJuYW1lXCJdICE9PSB0aGlzLndwbGF5ZXIgJiYgdGhpcy5tb2RlbFtcInVzZXJuYW1lXCJdICE9PSB0aGlzLmJwbGF5ZXI7XHJcblxyXG4gICAgICAgIC8vIG9yaWVudGF0aW9uID0gdGhpcy5teWNvbG9yXHJcbiAgICAgICAgaWYgKHRoaXMuc3BlY3RhdG9yKSB7XHJcbiAgICAgICAgICAgIHRoaXMubXljb2xvciA9IHRoaXMudmFyaWFudCA9PT0gJ3Nob2dpJyA/ICdibGFjaycgOiAnd2hpdGUnO1xyXG4gICAgICAgICAgICB0aGlzLm9wcGNvbG9yID0gdGhpcy52YXJpYW50ID09PSAnc2hvZ2knID8gJ3doaXRlJyA6ICdibGFjayc7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5teWNvbG9yID0gdGhpcy5tb2RlbFtcInVzZXJuYW1lXCJdID09PSB0aGlzLndwbGF5ZXIgPyAnd2hpdGUnIDogJ2JsYWNrJztcclxuICAgICAgICAgICAgdGhpcy5vcHBjb2xvciA9IHRoaXMubW9kZWxbXCJ1c2VybmFtZVwiXSA9PT0gdGhpcy53cGxheWVyID8gJ2JsYWNrJyA6ICd3aGl0ZSc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBwbGF5ZXJzWzBdIGlzIHRvcCBwbGF5ZXIsIHBsYXllcnNbMV0gaXMgYm90dG9tIHBsYXllclxyXG4gICAgICAgIHRoaXMucGxheWVycyA9IFtcclxuICAgICAgICAgICAgdGhpcy5teWNvbG9yID09PSBcIndoaXRlXCIgPyB0aGlzLmJwbGF5ZXIgOiB0aGlzLndwbGF5ZXIsXHJcbiAgICAgICAgICAgIHRoaXMubXljb2xvciA9PT0gXCJ3aGl0ZVwiID8gdGhpcy53cGxheWVyIDogdGhpcy5icGxheWVyXHJcbiAgICAgICAgXTtcclxuICAgICAgICB0aGlzLnRpdGxlcyA9IFtcclxuICAgICAgICAgICAgdGhpcy5teWNvbG9yID09PSBcIndoaXRlXCIgPyB0aGlzLm1vZGVsWydidGl0bGUnXSA6IHRoaXMubW9kZWxbJ3d0aXRsZSddLFxyXG4gICAgICAgICAgICB0aGlzLm15Y29sb3IgPT09IFwid2hpdGVcIiA/IHRoaXMubW9kZWxbJ3d0aXRsZSddIDogdGhpcy5tb2RlbFsnYnRpdGxlJ11cclxuICAgICAgICBdO1xyXG5cclxuICAgICAgICB0aGlzLnJlc3VsdCA9IFwiXCI7XHJcbiAgICAgICAgY29uc3QgcGFydHMgPSB0aGlzLmZ1bGxmZW4uc3BsaXQoXCIgXCIpO1xyXG5cclxuICAgICAgICBjb25zdCBmZW5fcGxhY2VtZW50ID0gcGFydHNbMF07XHJcbiAgICAgICAgdGhpcy50dXJuQ29sb3IgPSBwYXJ0c1sxXSA9PT0gXCJ3XCIgPyBcIndoaXRlXCIgOiBcImJsYWNrXCI7XHJcblxyXG4gICAgICAgIHRoaXMuc3RlcHMucHVzaCh7XHJcbiAgICAgICAgICAgICdmZW4nOiBmZW5fcGxhY2VtZW50LFxyXG4gICAgICAgICAgICAnbW92ZSc6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgJ2NoZWNrJzogZmFsc2UsXHJcbiAgICAgICAgICAgICd0dXJuQ29sb3InOiB0aGlzLnR1cm5Db2xvcixcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuY2hlc3Nncm91bmQgPSBDaGVzc2dyb3VuZChlbCwge1xyXG4gICAgICAgICAgICBmZW46IGZlbl9wbGFjZW1lbnQsXHJcbiAgICAgICAgICAgIGdlb21ldHJ5OiBWQVJJQU5UU1t0aGlzLnZhcmlhbnRdLmdlb20sXHJcbiAgICAgICAgICAgIG9yaWVudGF0aW9uOiB0aGlzLm15Y29sb3IsXHJcbiAgICAgICAgICAgIHR1cm5Db2xvcjogdGhpcy50dXJuQ29sb3IsXHJcbiAgICAgICAgICAgIGFuaW1hdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZXZlbnRzOiB7XHJcbiAgICAgICAgICAgICAgICBpbnNlcnQoZWxlbWVudHMpIHtyZXNpemVIYW5kbGUoZWxlbWVudHMpO31cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5zcGVjdGF0b3IpIHtcclxuICAgICAgICAgICAgdGhpcy5jaGVzc2dyb3VuZC5zZXQoe1xyXG4gICAgICAgICAgICAgICAgdmlld09ubHk6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBldmVudHM6IHtcclxuICAgICAgICAgICAgICAgICAgICBtb3ZlOiB0aGlzLm9uTW92ZSgpLFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmNoZXNzZ3JvdW5kLnNldCh7XHJcbiAgICAgICAgICAgICAgICBtb3ZhYmxlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZnJlZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IHRoaXMubXljb2xvcixcclxuICAgICAgICAgICAgICAgICAgICBzaG93RGVzdHM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFmdGVyOiB0aGlzLm9uVXNlck1vdmUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFmdGVyTmV3UGllY2U6IHRoaXMub25Vc2VyRHJvcCxcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgZXZlbnRzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbW92ZTogdGhpcy5vbk1vdmUoKSxcclxuICAgICAgICAgICAgICAgICAgICBkcm9wTmV3UGllY2U6IHRoaXMub25Ecm9wKCksXHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0OiB0aGlzLm9uU2VsZWN0KHRoaXMuY2hlc3Nncm91bmQuc3RhdGUuc2VsZWN0ZWQpLFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmdhdGluZyA9IG1ha2VHYXRpbmcodGhpcyk7XHJcbiAgICAgICAgdGhpcy5wcm9tb3Rpb24gPSBtYWtlUHJvbW90aW9uKHRoaXMpO1xyXG5cclxuICAgICAgICAvLyBpbml0aWFsaXplIHBvY2tldHNcclxuICAgICAgICBpZiAobmVlZFBvY2tldHModGhpcy52YXJpYW50KSkge1xyXG4gICAgICAgICAgICBjb25zdCBwb2NrZXQwID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BvY2tldDAnKSBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICAgICAgY29uc3QgcG9ja2V0MSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwb2NrZXQxJykgYXMgSFRNTEVsZW1lbnQ7XHJcbiAgICAgICAgICAgIHVwZGF0ZVBvY2tldHModGhpcywgcG9ja2V0MCwgcG9ja2V0MSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwYXRjaChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYm9hcmQtc2V0dGluZ3MnKSBhcyBIVE1MRWxlbWVudCwgc2V0dGluZ3NWaWV3KHRoaXMpKTtcclxuXHJcbiAgICAgICAgcGF0Y2goZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21vdmVsaXN0JykgYXMgSFRNTEVsZW1lbnQsIG1vdmVsaXN0Vmlldyh0aGlzKSk7XHJcblxyXG4gICAgICAgIHBhdGNoKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyb3VuZGNoYXQnKSBhcyBIVE1MRWxlbWVudCwgY2hhdFZpZXcodGhpcywgXCJyb3VuZGNoYXRcIikpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldEdyb3VuZCA9ICgpID0+IHRoaXMuY2hlc3Nncm91bmQ7XHJcbiAgICBnZXREZXN0cyA9ICgpID0+IHRoaXMuZGVzdHM7XHJcblxyXG4gICAgcHJpdmF0ZSBnYW1lT3ZlciA9ICgpID0+IHtcclxuICAgICAgICB2YXIgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3VsdCcpIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgIHBhdGNoKGNvbnRhaW5lciwgaCgnZGl2I3Jlc3VsdCcsIHJlc3VsdCh0aGlzLnN0YXR1cywgdGhpcy5yZXN1bHQpKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjaGVja1N0YXR1cyA9IChtc2cpID0+IHtcclxuICAgICAgICBpZiAobXNnLmdhbWVJZCAhPT0gdGhpcy5tb2RlbFtcImdhbWVJZFwiXSkgcmV0dXJuO1xyXG4gICAgICAgIGlmIChtc2cuc3RhdHVzID49IDAgJiYgdGhpcy5yZXN1bHQgPT09IFwiXCIpIHtcclxuICAgICAgICAgICAgdGhpcy5yZXN1bHQgPSBtc2cucmVzdWx0O1xyXG4gICAgICAgICAgICB0aGlzLnN0YXR1cyA9IG1zZy5zdGF0dXM7XHJcbiAgICAgICAgICAgIHRoaXMuZ2FtZU92ZXIoKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMucGduID0gbXNnLnBnbjtcclxuICAgICAgICAgICAgdmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwZ24nKSBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICAgICAgdGhpcy52cG5nID0gcGF0Y2goY29udGFpbmVyLCBoKCdkaXYjcGduJywgW2goJ2RpdicsIHRoaXMuZnVsbGZlbiksIGgoJ3RleHRhcmVhJywgeyBhdHRyczogeyByb3dzOiAxMywgcmVhZG9ubHk6IHRydWUsIHNwZWxsY2hlY2s6IGZhbHNlfSB9LCBtc2cucGduKV0pKTtcclxuXHJcbiAgICAgICAgICAgIHNlbGVjdE1vdmUodGhpcywgdGhpcy5wbHkpO1xyXG5cclxuICAgICAgICAgICAgLy8gVE9ETzogbW92ZSB0aGlzIHRvIChub3QgaW1wbGVtZW50ZWQgeWV0KSBhbmFseXNpcyBwYWdlXHJcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJBTkFMWVNJU1wiKTtcclxuICAgICAgICAgICAgLy90aGlzLmRvU2VuZCh7IHR5cGU6IFwiYW5hbHlzaXNcIiwgdXNlcm5hbWU6IHRoaXMubW9kZWxbXCJ1c2VybmFtZVwiXSwgZ2FtZUlkOiB0aGlzLm1vZGVsW1wiZ2FtZUlkXCJdIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uTXNnQm9hcmQgPSAobXNnKSA9PiB7XHJcbiAgICAgICAgaWYgKG1zZy5nYW1lSWQgIT09IHRoaXMubW9kZWxbXCJnYW1lSWRcIl0pIHJldHVybjtcclxuXHJcbiAgICAgICAgLy8gY29uc29sZS5sb2coXCJnb3QgYm9hcmQgbXNnOlwiLCBtc2cpO1xyXG4gICAgICAgIHRoaXMucGx5ID0gbXNnLnBseVxyXG4gICAgICAgIHRoaXMuZnVsbGZlbiA9IG1zZy5mZW47XHJcbiAgICAgICAgdGhpcy5kZXN0cyA9IG1zZy5kZXN0cztcclxuICAgICAgICAvLyBsaXN0IG9mIGxlZ2FsIHByb21vdGlvbiBtb3Zlc1xyXG4gICAgICAgIHRoaXMucHJvbW90aW9ucyA9IG1zZy5wcm9tbztcclxuXHJcbiAgICAgICAgY29uc3QgcGFydHMgPSBtc2cuZmVuLnNwbGl0KFwiIFwiKTtcclxuICAgICAgICB0aGlzLnR1cm5Db2xvciA9IHBhcnRzWzFdID09PSBcIndcIiA/IFwid2hpdGVcIiA6IFwiYmxhY2tcIjtcclxuXHJcbiAgICAgICAgaWYgKG1zZy5zdGVwcy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3RlcHMgPSBbXTtcclxuICAgICAgICAgICAgdmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtb3ZlbGlzdCcpIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgICAgICBwYXRjaChjb250YWluZXIsIGgoJ2RpdiNtb3ZlbGlzdCcpKTtcclxuXHJcbiAgICAgICAgICAgIG1zZy5zdGVwcy5mb3JFYWNoKChzdGVwKSA9PiB7IFxyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGVwcy5wdXNoKHN0ZXApO1xyXG4gICAgICAgICAgICAgICAgdXBkYXRlTW92ZWxpc3QodGhpcyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAobXNnLnBseSA9PT0gdGhpcy5zdGVwcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHN0ZXAgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJ2Zlbic6IG1zZy5mZW4sXHJcbiAgICAgICAgICAgICAgICAgICAgJ21vdmUnOiBtc2cubGFzdE1vdmUsXHJcbiAgICAgICAgICAgICAgICAgICAgJ2NoZWNrJzogbXNnLmNoZWNrLFxyXG4gICAgICAgICAgICAgICAgICAgICd0dXJuQ29sb3InOiB0aGlzLnR1cm5Db2xvcixcclxuICAgICAgICAgICAgICAgICAgICAnc2FuJzogbXNnLnN0ZXBzWzBdLnNhbixcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGVwcy5wdXNoKHN0ZXApO1xyXG4gICAgICAgICAgICAgICAgdXBkYXRlTW92ZWxpc3QodGhpcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBsYXN0TW92ZSA9IG1zZy5sYXN0TW92ZTtcclxuICAgICAgICBpZiAobGFzdE1vdmUgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMudmFyaWFudCA9PT0gXCJzaG9naVwiKSB7XHJcbiAgICAgICAgICAgICAgICBsYXN0TW92ZSA9IHVzaTJ1Y2kobGFzdE1vdmUpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMudmFyaWFudCA9PT0gXCJncmFuZFwiIHx8IHRoaXMudmFyaWFudCA9PT0gXCJncmFuZGhvdXNlXCIpIHtcclxuICAgICAgICAgICAgICAgIGxhc3RNb3ZlID0gZ3JhbmQyemVybyhsYXN0TW92ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbGFzdE1vdmUgPSBbbGFzdE1vdmUuc2xpY2UoMCwyKSwgbGFzdE1vdmUuc2xpY2UoMiw0KV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIGRyb3AgbGFzdE1vdmUgY2F1c2luZyBzY3JvbGxiYXIgZmxpY2tlcixcclxuICAgICAgICAvLyBzbyB3ZSByZW1vdmUgZnJvbSBwYXJ0IHRvIGF2b2lkIHRoYXRcclxuICAgICAgICBpZiAobGFzdE1vdmUgIT09IG51bGwgJiYgbGFzdE1vdmVbMF1bMV0gPT09ICdAJykgbGFzdE1vdmUgPSBbbGFzdE1vdmVbMV1dO1xyXG4gICAgICAgIC8vIHNhdmUgY2FwdHVyZSBzdGF0ZSBiZWZvcmUgdXBkYXRpbmcgY2hlc3Nncm91bmRcclxuICAgICAgICBjb25zdCBjYXB0dXJlID0gbGFzdE1vdmUgIT09IG51bGwgJiYgdGhpcy5jaGVzc2dyb3VuZC5zdGF0ZS5waWVjZXNbbGFzdE1vdmVbMV1dXHJcblxyXG4gICAgICAgIGlmIChsYXN0TW92ZSAhPT0gbnVsbCAmJiAodGhpcy50dXJuQ29sb3IgPT09IHRoaXMubXljb2xvciB8fCB0aGlzLnNwZWN0YXRvcikpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMudmFyaWFudCA9PT0gXCJzaG9naVwiKSB7XHJcbiAgICAgICAgICAgICAgICBzb3VuZC5zaG9naW1vdmUoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmIChjYXB0dXJlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc291bmQuY2FwdHVyZSgpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBzb3VuZC5tb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsYXN0TW92ZSA9IFtdO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmNoZWNrU3RhdHVzKG1zZyk7XHJcbiAgICAgICAgaWYgKG1zZy5jaGVjaykge1xyXG4gICAgICAgICAgICBzb3VuZC5jaGVjaygpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuc3BlY3RhdG9yKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2hlc3Nncm91bmQuc2V0KHtcclxuICAgICAgICAgICAgICAgIGZlbjogcGFydHNbMF0sXHJcbiAgICAgICAgICAgICAgICB0dXJuQ29sb3I6IHRoaXMudHVybkNvbG9yLFxyXG4gICAgICAgICAgICAgICAgY2hlY2s6IG1zZy5jaGVjayxcclxuICAgICAgICAgICAgICAgIGxhc3RNb3ZlOiBsYXN0TW92ZSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHVwZGF0ZVBvY2tldHModGhpcywgdGhpcy52cG9ja2V0MCwgdGhpcy52cG9ja2V0MSk7XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBnb1BseSA9IChwbHkpID0+IHtcclxuICAgICAgICBjb25zdCBzdGVwID0gdGhpcy5zdGVwc1twbHldO1xyXG4gICAgICAgIHZhciBtb3ZlID0gc3RlcFsnbW92ZSddO1xyXG4gICAgICAgIHZhciBjYXB0dXJlID0gZmFsc2U7XHJcbiAgICAgICAgaWYgKG1vdmUgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy52YXJpYW50ID09PSBcInNob2dpXCIpIG1vdmUgPSB1c2kydWNpKG1vdmUpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy52YXJpYW50ID09PSBcImdyYW5kXCIgfHwgdGhpcy52YXJpYW50ID09PSBcImdyYW5kaG91c2VcIikgbW92ZSA9IGdyYW5kMnplcm8obW92ZSk7XHJcbiAgICAgICAgICAgIG1vdmUgPSBtb3ZlLnNsaWNlKDEsIDIpID09PSAnQCcgPyBbbW92ZS5zbGljZSgyLCA0KV0gOiBbbW92ZS5zbGljZSgwLCAyKSwgbW92ZS5zbGljZSgyLCA0KV07XHJcbiAgICAgICAgICAgIGNhcHR1cmUgPSB0aGlzLmNoZXNzZ3JvdW5kLnN0YXRlLnBpZWNlc1ttb3ZlW21vdmUubGVuZ3RoIC0gMV1dICE9PSB1bmRlZmluZWQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNoZXNzZ3JvdW5kLnNldCh7XHJcbiAgICAgICAgICAgIGZlbjogc3RlcC5mZW4sXHJcbiAgICAgICAgICAgIHR1cm5Db2xvcjogc3RlcC50dXJuQ29sb3IsXHJcbiAgICAgICAgICAgIG1vdmFibGU6IHtcclxuICAgICAgICAgICAgICAgIGZyZWU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgY29sb3I6IHRoaXMuc3BlY3RhdG9yID8gdW5kZWZpbmVkIDogc3RlcC50dXJuQ29sb3IsXHJcbiAgICAgICAgICAgICAgICBkZXN0czogdGhpcy5yZXN1bHQgPT09IFwiXCIgJiYgcGx5ID09PSB0aGlzLnN0ZXBzLmxlbmd0aCAtIDEgPyB0aGlzLmRlc3RzIDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgY2hlY2s6IHN0ZXAuY2hlY2ssXHJcbiAgICAgICAgICAgIGxhc3RNb3ZlOiBtb3ZlLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuZnVsbGZlbiA9IHN0ZXAuZmVuO1xyXG4gICAgICAgIHVwZGF0ZVBvY2tldHModGhpcywgdGhpcy52cG9ja2V0MCwgdGhpcy52cG9ja2V0MSk7XHJcblxyXG4gICAgICAgIGlmIChwbHkgPT09IHRoaXMucGx5ICsgMSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy52YXJpYW50ID09PSBcInNob2dpXCIpIHtcclxuICAgICAgICAgICAgICAgIHNvdW5kLnNob2dpbW92ZSgpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKGNhcHR1cmUpIHtcclxuICAgICAgICAgICAgICAgICAgICBzb3VuZC5jYXB0dXJlKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHNvdW5kLm1vdmUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnBseSA9IHBseVxyXG5cclxuICAgICAgICB0aGlzLnZwbmcgPSBwYXRjaCh0aGlzLnZwbmcsIGgoJ2RpdiNwZ24nLCBbaCgnZGl2JywgdGhpcy5mdWxsZmVuKSwgaCgndGV4dGFyZWEnLCB7IGF0dHJzOiB7IHJvd3M6IDEzLCByZWFkb25seTogdHJ1ZSwgc3BlbGxjaGVjazogZmFsc2UgfSB9LCB0aGlzLnBnbildKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBkb1NlbmQgPSAobWVzc2FnZSkgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiLS0tPiBkb1NlbmQoKTpcIiwgbWVzc2FnZSk7XHJcbiAgICAgICAgdGhpcy5zb2NrLnNlbmQoSlNPTi5zdHJpbmdpZnkobWVzc2FnZSkpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2VuZE1vdmUgPSAob3JpZywgZGVzdCwgcHJvbW8pID0+IHtcclxuICAgICAgICAvLyBwYXVzZSgpIHdpbGwgYWRkIGluY3JlbWVudCFcclxuICAgICAgICAvLyBjb25zb2xlLmxvZyhcInNlbmRNb3ZlKG9yaWcsIGRlc3QsIHByb20pXCIsIG9yaWcsIGRlc3QsIHByb21vKTtcclxuICAgICAgICBjb25zdCB1Y2lfbW92ZSA9IG9yaWcgKyBkZXN0ICsgcHJvbW87XHJcbiAgICAgICAgY29uc3QgbW92ZSA9IHRoaXMudmFyaWFudCA9PT0gXCJzaG9naVwiID8gdWNpMnVzaSh1Y2lfbW92ZSkgOiAodGhpcy52YXJpYW50ID09PSBcImdyYW5kXCIgfHwgdGhpcy52YXJpYW50ID09PSBcImdyYW5kaG91c2VcIikgPyB6ZXJvMmdyYW5kKHVjaV9tb3ZlKSA6IHVjaV9tb3ZlO1xyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwic2VuZE1vdmUobW92ZSlcIiwgbW92ZSk7XHJcbiAgICAgICAgdGhpcy5kb1NlbmQoeyB0eXBlOiBcIm1vdmVcIiwgZ2FtZUlkOiB0aGlzLm1vZGVsW1wiZ2FtZUlkXCJdLCBtb3ZlOiBtb3ZlIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25Nb3ZlID0gKCkgPT4ge1xyXG4gICAgICAgIHJldHVybiAob3JpZywgZGVzdCwgY2FwdHVyZWRQaWVjZSkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIiAgIGdyb3VuZC5vbk1vdmUoKVwiLCBvcmlnLCBkZXN0LCBjYXB0dXJlZFBpZWNlKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMudmFyaWFudCA9PT0gXCJzaG9naVwiKSB7XHJcbiAgICAgICAgICAgICAgICBzb3VuZC5zaG9naW1vdmUoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmIChjYXB0dXJlZFBpZWNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc291bmQuY2FwdHVyZSgpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBzb3VuZC5tb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkRyb3AgPSAoKSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIChwaWVjZSwgZGVzdCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImdyb3VuZC5vbkRyb3AoKVwiLCBwaWVjZSwgZGVzdCk7XHJcbiAgICAgICAgICAgIGlmIChkZXN0ICE9ICd6MCcgJiYgcGllY2Uucm9sZSAmJiBkcm9wSXNWYWxpZCh0aGlzLmRlc3RzLCBwaWVjZS5yb2xlLCBkZXN0KSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudmFyaWFudCA9PT0gXCJzaG9naVwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc291bmQuc2hvZ2ltb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHNvdW5kLm1vdmUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2xpY2tEcm9wID0gcGllY2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblVzZXJNb3ZlID0gKG9yaWcsIGRlc3QsIG1ldGEpID0+IHtcclxuICAgICAgICAvLyBjaGVzc2dyb3VuZCBkb2Vzbid0IGtub3dzIGFib3V0IGVwLCBzbyB3ZSBoYXZlIHRvIHJlbW92ZSBlcCBjYXB0dXJlZCBwYXduXHJcbiAgICAgICAgY29uc3QgcGllY2VzID0gdGhpcy5jaGVzc2dyb3VuZC5zdGF0ZS5waWVjZXM7XHJcbiAgICAgICAgY29uc3QgZ2VvbSA9IHRoaXMuY2hlc3Nncm91bmQuc3RhdGUuZ2VvbWV0cnk7XHJcbiAgICAgICAgLy8gY29uc29sZS5sb2coXCJncm91bmQub25Vc2VyTW92ZSgpXCIsIG9yaWcsIGRlc3QsIG1ldGEsIHBpZWNlcyk7XHJcbiAgICAgICAgY29uc3QgbW92ZWQgPSBwaWVjZXNbZGVzdF0gYXMgUGllY2U7XHJcbiAgICAgICAgY29uc3QgZmlyc3RSYW5rSXMwID0gdGhpcy5jaGVzc2dyb3VuZC5zdGF0ZS5kaW1lbnNpb25zLmhlaWdodCA9PT0gMTA7XHJcbiAgICAgICAgaWYgKG1ldGEuY2FwdHVyZWQgPT09IHVuZGVmaW5lZCAmJiBtb3ZlZC5yb2xlID09PSBcInBhd25cIiAmJiBvcmlnWzBdICE9IGRlc3RbMF0gJiYgaGFzRXAodGhpcy52YXJpYW50KSkge1xyXG4gICAgICAgICAgICBjb25zdCBwb3MgPSBrZXkycG9zKGRlc3QsIGZpcnN0UmFua0lzMCksXHJcbiAgICAgICAgICAgIHBhd25Qb3M6IFBvcyA9IFtwb3NbMF0sIHBvc1sxXSArICh0aGlzLm15Y29sb3IgPT09ICd3aGl0ZScgPyAtMSA6IDEpXTtcclxuICAgICAgICAgICAgY29uc3QgZGlmZjogUGllY2VzRGlmZiA9IHt9O1xyXG4gICAgICAgICAgICBkaWZmW3BvczJrZXkocGF3blBvcywgZ2VvbSldID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB0aGlzLmNoZXNzZ3JvdW5kLnNldFBpZWNlcyhkaWZmKTtcclxuICAgICAgICAgICAgbWV0YS5jYXB0dXJlZCA9IHtyb2xlOiBcInBhd25cIn07XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvLyBpbmNyZWFzZSBwb2NrZXQgY291bnRcclxuICAgICAgICBpZiAoKHRoaXMudmFyaWFudCA9PT0gXCJjcmF6eWhvdXNlXCIgfHwgdGhpcy52YXJpYW50ID09PSBcImNhcGFob3VzZVwiIHx8IHRoaXMudmFyaWFudCA9PT0gXCJzaG91c2VcIiB8fCB0aGlzLnZhcmlhbnQgPT09IFwiZ3JhbmRob3VzZVwiIHx8IHRoaXMudmFyaWFudCA9PT0gXCJzaG9naVwiKSAmJiBtZXRhLmNhcHR1cmVkKSB7XHJcbiAgICAgICAgICAgIHZhciByb2xlID0gbWV0YS5jYXB0dXJlZC5yb2xlXHJcbiAgICAgICAgICAgIGlmIChtZXRhLmNhcHR1cmVkLnByb21vdGVkKSByb2xlID0gdGhpcy52YXJpYW50ID09PSBcInNob2dpXCIgPyBtZXRhLmNhcHR1cmVkLnJvbGUuc2xpY2UoMSkgYXMgUm9sZSA6IFwicGF3blwiO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuZmxpcCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wb2NrZXRzWzBdW3JvbGVdKys7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnZwb2NrZXQwID0gcGF0Y2godGhpcy52cG9ja2V0MCwgcG9ja2V0Vmlldyh0aGlzLCB0aGlzLm15Y29sb3IsIFwidG9wXCIpKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucG9ja2V0c1sxXVtyb2xlXSsrO1xyXG4gICAgICAgICAgICAgICAgdGhpcy52cG9ja2V0MSA9IHBhdGNoKHRoaXMudnBvY2tldDEsIHBvY2tldFZpZXcodGhpcywgdGhpcy5teWNvbG9yLCBcImJvdHRvbVwiKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyAgZ2F0aW5nIGVsZXBoYW50L2hhd2tcclxuICAgICAgICBpZiAodGhpcy52YXJpYW50ID09PSBcInNlaXJhd2FuXCIgfHwgdGhpcy52YXJpYW50ID09PSBcInNob3VzZVwiKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5wcm9tb3Rpb24uc3RhcnQob3JpZywgZGVzdCwgbWV0YSkgJiYgIXRoaXMuZ2F0aW5nLnN0YXJ0KHRoaXMuZnVsbGZlbiwgb3JpZywgZGVzdCwgbWV0YSkpIHRoaXMuc2VuZE1vdmUob3JpZywgZGVzdCwgJycpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5wcm9tb3Rpb24uc3RhcnQob3JpZywgZGVzdCwgbWV0YSkpIHRoaXMuc2VuZE1vdmUob3JpZywgZGVzdCwgJycpO1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblVzZXJEcm9wID0gKHJvbGUsIGRlc3QpID0+IHtcclxuICAgICAgICAvLyBjb25zb2xlLmxvZyhcImdyb3VuZC5vblVzZXJEcm9wKClcIiwgcm9sZSwgZGVzdCk7XHJcbiAgICAgICAgLy8gZGVjcmVhc2UgcG9ja2V0IGNvdW50XHJcbiAgICAgICAgLy9jYW5jZWxEcm9wTW9kZSh0aGlzLmNoZXNzZ3JvdW5kLnN0YXRlKTtcclxuICAgICAgICBpZiAoZHJvcElzVmFsaWQodGhpcy5kZXN0cywgcm9sZSwgZGVzdCkpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuZmxpcCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wb2NrZXRzWzBdW3JvbGVdLS07XHJcbiAgICAgICAgICAgICAgICB0aGlzLnZwb2NrZXQwID0gcGF0Y2godGhpcy52cG9ja2V0MCwgcG9ja2V0Vmlldyh0aGlzLCB0aGlzLm15Y29sb3IsIFwidG9wXCIpKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucG9ja2V0c1sxXVtyb2xlXS0tO1xyXG4gICAgICAgICAgICAgICAgdGhpcy52cG9ja2V0MSA9IHBhdGNoKHRoaXMudnBvY2tldDEsIHBvY2tldFZpZXcodGhpcywgdGhpcy5teWNvbG9yLCBcImJvdHRvbVwiKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5zZW5kTW92ZShyb2xlVG9TYW5bcm9sZV0gKyBcIkBcIiwgZGVzdCwgJycpXHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwic2VudCBtb3ZlXCIsIG1vdmUpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiISEhIGludmFsaWQgbW92ZSAhISFcIiwgcm9sZSwgZGVzdCk7XHJcbiAgICAgICAgICAgIC8vIHJlc3RvcmUgYm9hcmRcclxuICAgICAgICAgICAgdGhpcy5jbGlja0Ryb3AgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuY2hlc3Nncm91bmQuc2V0KHtcclxuICAgICAgICAgICAgICAgIGZlbjogdGhpcy5mdWxsZmVuLFxyXG4gICAgICAgICAgICAgICAgbGFzdE1vdmU6IHRoaXMubGFzdG1vdmUsXHJcbiAgICAgICAgICAgICAgICB0dXJuQ29sb3I6IHRoaXMubXljb2xvcixcclxuICAgICAgICAgICAgICAgIG1vdmFibGU6IHtcclxuICAgICAgICAgICAgICAgICAgICBkZXN0czogdGhpcy5kZXN0cyxcclxuICAgICAgICAgICAgICAgICAgICBzaG93RGVzdHM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblNlbGVjdCA9IChzZWxlY3RlZCkgPT4ge1xyXG4gICAgICAgIHJldHVybiAoa2V5KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ3JvdW5kLm9uU2VsZWN0KClcIiwga2V5LCBzZWxlY3RlZCwgdGhpcy5jbGlja0Ryb3AsIHRoaXMuY2hlc3Nncm91bmQuc3RhdGUpO1xyXG4gICAgICAgICAgICAvLyBJZiBkcm9wIHNlbGVjdGlvbiB3YXMgc2V0IGRyb3BEZXN0cyB3ZSBoYXZlIHRvIHJlc3RvcmUgZGVzdHMgaGVyZVxyXG4gICAgICAgICAgICBpZiAodGhpcy5jaGVzc2dyb3VuZC5zdGF0ZS5tb3ZhYmxlLmRlc3RzID09PSB1bmRlZmluZWQpIHJldHVybjtcclxuICAgICAgICAgICAgaWYgKGtleSAhPSAnejAnICYmICd6MCcgaW4gdGhpcy5jaGVzc2dyb3VuZC5zdGF0ZS5tb3ZhYmxlLmRlc3RzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jbGlja0Ryb3AgIT09IHVuZGVmaW5lZCAmJiBkcm9wSXNWYWxpZCh0aGlzLmRlc3RzLCB0aGlzLmNsaWNrRHJvcC5yb2xlLCBrZXkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGVzc2dyb3VuZC5uZXdQaWVjZSh0aGlzLmNsaWNrRHJvcCwga2V5KTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uVXNlckRyb3AodGhpcy5jbGlja0Ryb3Aucm9sZSwga2V5KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoaXMuY2xpY2tEcm9wID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgLy9jYW5jZWxEcm9wTW9kZSh0aGlzLmNoZXNzZ3JvdW5kLnN0YXRlKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2hlc3Nncm91bmQuc2V0KHsgbW92YWJsZTogeyBkZXN0czogdGhpcy5kZXN0cyB9fSk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIC8vIFNpdHR1eWluIGluIHBsYWNlIHByb21vdGlvbiBvbiBDdHJsK2NsaWNrXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNoZXNzZ3JvdW5kLnN0YXRlLnN0YXRzLmN0cmxLZXkgJiYgXHJcbiAgICAgICAgICAgICAgICAoa2V5IGluIHRoaXMuY2hlc3Nncm91bmQuc3RhdGUubW92YWJsZS5kZXN0cykgJiZcclxuICAgICAgICAgICAgICAgICh0aGlzLmNoZXNzZ3JvdW5kLnN0YXRlLm1vdmFibGUuZGVzdHNba2V5XS5pbmRleE9mKGtleSkgPj0gMCkgJiZcclxuICAgICAgICAgICAgICAgICh0aGlzLnZhcmlhbnQgPT09ICdzaXR0dXlpbicpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkN0cmwgaW4gcGxhY2UgcHJvbW90aW9uXCIsIGtleSk7XHJcbiAgICAgICAgICAgICAgICB2YXIgcGllY2VzID0ge307XHJcbiAgICAgICAgICAgICAgICB2YXIgcGllY2UgPSB0aGlzLmNoZXNzZ3JvdW5kLnN0YXRlLnBpZWNlc1trZXldO1xyXG4gICAgICAgICAgICAgICAgcGllY2VzW2tleV0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IHBpZWNlIS5jb2xvcixcclxuICAgICAgICAgICAgICAgICAgICByb2xlOiAnZmVyeicsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvbW90ZWQ6IHRydWVcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNoZXNzZ3JvdW5kLnNldFBpZWNlcyhwaWVjZXMpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZW5kTW92ZShrZXksIGtleSwgJ2YnKTtcclxuXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25Nc2dVc2VyQ29ubmVjdGVkID0gKCkgPT4ge1xyXG4gICAgICAgIC8vIHdlIHdhbnQgdG8ga25vdyBsYXN0TW92ZSBhbmQgY2hlY2sgc3RhdHVzXHJcbiAgICAgICAgdGhpcy5kb1NlbmQoeyB0eXBlOiBcImJvYXJkXCIsIGdhbWVJZDogdGhpcy5tb2RlbFtcImdhbWVJZFwiXSB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uTXNnQ2hhdCA9IChtc2cpID0+IHtcclxuICAgICAgICBpZiAobXNnLnVzZXIgIT09IHRoaXMubW9kZWxbXCJ1c2VybmFtZVwiXSkgY2hhdE1lc3NhZ2UobXNnLnVzZXIsIG1zZy5tZXNzYWdlLCBcInJvdW5kY2hhdFwiKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uTWVzc2FnZSA9IChldnQpID0+IHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIjwrKysgb25NZXNzYWdlKCk6XCIsIGV2dC5kYXRhKTtcclxuICAgICAgICB2YXIgbXNnID0gSlNPTi5wYXJzZShldnQuZGF0YSk7XHJcbiAgICAgICAgc3dpdGNoIChtc2cudHlwZSkge1xyXG4gICAgICAgICAgICBjYXNlIFwiYm9hcmRcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMub25Nc2dCb2FyZChtc2cpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJnYW1lX3VzZXJfY29ubmVjdGVkXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uTXNnVXNlckNvbm5lY3RlZCgpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJyb3VuZGNoYXRcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMub25Nc2dDaGF0KG1zZyk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuIiwiaW1wb3J0IHsgaW5pdCB9IGZyb20gXCJzbmFiYmRvbVwiO1xuaW1wb3J0IGtsYXNzIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvY2xhc3MnO1xuaW1wb3J0IGF0dHJpYnV0ZXMgZnJvbSAnc25hYmJkb20vbW9kdWxlcy9hdHRyaWJ1dGVzJztcbmltcG9ydCBwcm9wZXJ0aWVzIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvcHJvcHMnO1xuaW1wb3J0IGxpc3RlbmVycyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL2V2ZW50bGlzdGVuZXJzJztcblxuY29uc3QgcGF0Y2ggPSBpbml0KFtrbGFzcywgYXR0cmlidXRlcywgcHJvcGVydGllcywgbGlzdGVuZXJzXSk7XG5cbmltcG9ydCBoIGZyb20gJ3NuYWJiZG9tL2gnO1xuXG5leHBvcnQgZnVuY3Rpb24gY2hhdFZpZXcgKGN0cmwsIGNoYXRUeXBlKSB7XG4gICAgZnVuY3Rpb24gb25LZXlQcmVzcyAoZSkge1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gKGUudGFyZ2V0IGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlXG4gICAgICAgIGlmICgoZS5rZXlDb2RlID09IDEzIHx8IGUud2hpY2ggPT0gMTMpICYmIG1lc3NhZ2UubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY2hhdE1lc3NhZ2UgKGN0cmwubW9kZWxbJ3VzZXJuYW1lJ10sIG1lc3NhZ2UsIGNoYXRUeXBlKTtcbiAgICAgICAgICAgIGN0cmwuc29jay5zZW5kKEpTT04uc3RyaW5naWZ5KHtcInR5cGVcIjogY2hhdFR5cGUsIFwibWVzc2FnZVwiOiBtZXNzYWdlLCBcImdhbWVJZFwiOiBjdHJsLm1vZGVsW1wiZ2FtZUlkXCJdIH0pKTtcbiAgICAgICAgICAgIChlLnRhcmdldCBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZSA9IFwiXCI7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gaChgZGl2LiR7Y2hhdFR5cGV9IyR7Y2hhdFR5cGV9YCwgeyBjbGFzczoge1wiY2hhdFwiOiB0cnVlfSB9LCBbXG4gICAgICAgICAgICAgICAgaChgb2wjJHtjaGF0VHlwZX0tbWVzc2FnZXNgLCBbIGgoXCJkaXYjbWVzc2FnZXNcIildKSxcbiAgICAgICAgICAgICAgICBoKCdpbnB1dCNjaGF0LWVudHJ5Jywge1xuICAgICAgICAgICAgICAgICAgICBwcm9wczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJ0ZXh0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcImVudHJ5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBhdXRvY29tcGxldGU6IFwib2ZmXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogXCJQbGVhc2UgYmUgbmljZSBpbiB0aGUgY2hhdCFcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heGxlbmd0aDogXCIxNDBcIixcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb246IHsga2V5cHJlc3M6IChlKSA9PiBvbktleVByZXNzKGUpIH0sXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIF0pXG4gICAgfVxuXG5leHBvcnQgZnVuY3Rpb24gY2hhdE1lc3NhZ2UgKHVzZXIsIG1lc3NhZ2UsIGNoYXRUeXBlKSB7XG4gICAgY29uc3QgbXlEaXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChjaGF0VHlwZSArICctbWVzc2FnZXMnKSBhcyBIVE1MRWxlbWVudDtcbiAgICAvLyBZb3UgbXVzdCBhZGQgYm9yZGVyIHdpZHRocywgcGFkZGluZyBhbmQgbWFyZ2lucyB0byB0aGUgcmlnaHQuXG4gICAgY29uc3QgaXNTY3JvbGxlZCA9IG15RGl2LnNjcm9sbFRvcCA9PSBteURpdi5zY3JvbGxIZWlnaHQgLSBteURpdi5vZmZzZXRIZWlnaHQ7XG5cbiAgICB2YXIgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21lc3NhZ2VzJykgYXMgSFRNTEVsZW1lbnQ7XG4gICAgaWYgKHVzZXIubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHBhdGNoKGNvbnRhaW5lciwgaCgnZGl2I21lc3NhZ2VzJywgWyBoKFwibGkubWVzc2FnZS5vZmZlclwiLCBbaChcInRcIiwgbWVzc2FnZSldKSBdKSk7XG4gICAgfSBlbHNlIGlmICh1c2VyID09PSAnX3NlcnZlcicpIHtcbiAgICAgICAgcGF0Y2goY29udGFpbmVyLCBoKCdkaXYjbWVzc2FnZXMnLCBbIGgoXCJsaS5tZXNzYWdlLnNlcnZlclwiLCBbaChcInVzZXJcIiwgJ1NlcnZlcicpLCBoKFwidFwiLCBtZXNzYWdlKV0pIF0pKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBwYXRjaChjb250YWluZXIsIGgoJ2RpdiNtZXNzYWdlcycsIFsgaChcImxpLm1lc3NhZ2VcIiwgW2goXCJ1c2VyXCIsIHVzZXIpLCBoKFwidFwiLCBtZXNzYWdlKV0pIF0pKTtcbiAgICB9O1xuXG4gICAgaWYgKGlzU2Nyb2xsZWQpIG15RGl2LnNjcm9sbFRvcCA9IG15RGl2LnNjcm9sbEhlaWdodDtcbn0iLCJpbXBvcnQgeyBrZXkycG9zIH0gZnJvbSAnY2hlc3Nncm91bmR4L3V0aWwnO1xyXG5pbXBvcnQgeyBDb2xvciwgR2VvbWV0cnksIEtleSwgUm9sZSB9IGZyb20gJ2NoZXNzZ3JvdW5keC90eXBlcyc7XHJcblxyXG5leHBvcnQgY29uc3QgdmFyaWFudHMgPSBbXCJtYWtydWtcIiwgXCJzaXR0dXlpblwiLCBcInBsYWNlbWVudFwiLCBcImNyYXp5aG91c2VcIiwgXCJzdGFuZGFyZFwiLCBcInNob2dpXCIsIFwieGlhbmdxaVwiLCBcImNhcGFibGFuY2FcIiwgXCJzZWlyYXdhblwiLCBcImNhcGFob3VzZVwiLCBcInNob3VzZVwiLCBcImdyYW5kXCIsIFwiZ3JhbmRob3VzZVwiXTtcclxuZXhwb3J0IGNvbnN0IHZhcmlhbnRzOTYwID0gW1wiY3Jhenlob3VzZVwiLCBcInN0YW5kYXJkXCIsIFwiY2FwYWJsYW5jYVwiLCBcImNhcGFob3VzZVwiXTtcclxuXHJcbmV4cG9ydCBjb25zdCBWQVJJQU5UUyA9IHtcclxuICAgIG1ha3J1azogeyBnZW9tOiBHZW9tZXRyeS5kaW04eDgsIGNnOiBcImNnLTUxMlwiLCBib2FyZDogXCJncmlkXCIsIEJvYXJkQ1NTOiBbXCJtYWtyYjFcIiwgXCJtYWtyYjJcIl0sIHBpZWNlczogXCJtYWtydWtcIiwgUGllY2VDU1M6IFtcIm1ha3J1a1wiXSwgaWNvbjogXCJRXCJ9LFxyXG4gICAgc2l0dHV5aW46IHsgZ2VvbTogR2VvbWV0cnkuZGltOHg4LCBjZzogXCJjZy01MTJcIiwgYm9hcmQ6IFwiZ3JpZHhcIiwgQm9hcmRDU1M6IFtcInNpdHRiMVwiLCBcInNpdHRiMlwiXSwgcGllY2VzOiBcInNpdHR1eWluXCIsIFBpZWNlQ1NTOiBbXCJzaXR0dXlpbm1cIiwgXCJzaXR0dXlpbnNcIl0sIGljb246IFwiUlwiIH0sXHJcbiAgICBzaG9naTogeyBnZW9tOiBHZW9tZXRyeS5kaW05eDksIGNnOiBcImNnLTU3NlwiLCBib2FyZDogXCJncmlkOXg5XCIsIEJvYXJkQ1NTOiBbXCI5eDlhXCIsIFwiOXg5YlwiLCBcIjl4OWNcIiwgXCI5eDlkXCIsIFwiOXg5ZVwiLCBcIjl4OWZcIl0sIHBpZWNlczogXCJzaG9naVwiLCBQaWVjZUNTUzogW1wic2hvZ2kwa1wiLCBcInNob2dpMFwiLCBcInNob2dpMHdcIiwgXCJzaG9naTBwXCJdLCBpY29uOiBcIktcIiB9LFxyXG4gICAgeGlhbmdxaTogeyBnZW9tOiBHZW9tZXRyeS5kaW05eDEwLCBjZzogXCJjZy01NzYtNjQwXCIsIGJvYXJkOiBcInJpdmVyXCIsIEJvYXJkQ1NTOiBbXCI5eDEwYVwiLCBcIjl4MTBiXCIsIFwiOXgxMGNcIiwgXCI5eDEwZFwiLCBcIjl4MTBlXCJdLCBwaWVjZXM6IFwieGlhbmdxaVwiLCBQaWVjZUNTUzogW1wieGlhbmdxaVwiLCBcInhpYW5ncWllXCIsIFwieGlhbmdxaWN0MlwiLCBcInhpYW5ncWlobnpcIl0sIGljb246IFwiT1wiIH0sXHJcbiAgICBwbGFjZW1lbnQ6IHsgZ2VvbTogR2VvbWV0cnkuZGltOHg4LCBjZzogXCJjZy01MTJcIiwgYm9hcmQ6IFwiYm9hcmQ4eDhcIiwgQm9hcmRDU1M6IFtcIjh4OGJyb3duXCIsIFwiOHg4Ymx1ZVwiLCBcIjh4OGdyZWVuXCIsIFwiOHg4bWFwbGVcIiwgXCI4eDhvbGl2ZVwiXSwgcGllY2VzOiBcInN0YW5kYXJkXCIsIFBpZWNlQ1NTOiBbXCJzdGFuZGFyZFwiLCBcImdyZWVuXCIsIFwiYWxwaGFcIl0sIGljb246IFwiU1wiIH0sXHJcbiAgICBjcmF6eWhvdXNlOiB7IGdlb206IEdlb21ldHJ5LmRpbTh4OCwgY2c6IFwiY2ctNTEyXCIsIGJvYXJkOiBcImJvYXJkOHg4XCIsIEJvYXJkQ1NTOiBbXCI4eDhicm93blwiLCBcIjh4OGJsdWVcIiwgXCI4eDhncmVlblwiLCBcIjh4OG1hcGxlXCIsIFwiOHg4b2xpdmVcIl0sIHBpZWNlczogXCJzdGFuZGFyZFwiLCBQaWVjZUNTUzogW1wic3RhbmRhcmRcIiwgXCJncmVlblwiLCBcImFscGhhXCJdLCBpY29uOiBcIkhcIiB9LFxyXG4gICAgY2FwYWJsYW5jYTogeyBnZW9tOiBHZW9tZXRyeS5kaW0xMHg4LCBjZzogXCJjZy02NDBcIiwgYm9hcmQ6IFwiYm9hcmQxMHg4XCIsIEJvYXJkQ1NTOiBbXCIxMHg4YnJvd25cIiwgXCIxMHg4Ymx1ZVwiLCBcIjEweDhncmVlblwiLCBcIjEweDhtYXBsZVwiLCBcIjEweDhvbGl2ZVwiXSwgcGllY2VzOiBcImNhcGFcIiwgUGllY2VDU1M6IFtcImNhcGEwXCIsIFwiY2FwYTFcIiwgXCJjYXBhMlwiLCBcImNhcGEzXCJdLCBpY29uOiBcIlBcIiB9LFxyXG4gICAgY2FwYWhvdXNlOiB7IGdlb206IEdlb21ldHJ5LmRpbTEweDgsIGNnOiBcImNnLTY0MFwiLCBib2FyZDogXCJib2FyZDEweDhcIiwgQm9hcmRDU1M6IFtcIjEweDhicm93blwiLCBcIjEweDhibHVlXCIsIFwiMTB4OGdyZWVuXCIsIFwiMTB4OG1hcGxlXCIsIFwiMTB4OG9saXZlXCJdLCBwaWVjZXM6IFwiY2FwYVwiLCBQaWVjZUNTUzogW1wiY2FwYTBcIiwgXCJjYXBhMVwiLCBcImNhcGEyXCIsIFwiY2FwYTNcIl0sIGljb246IFwiUFwiIH0sXHJcbiAgICBncmFuZDogeyBnZW9tOiBHZW9tZXRyeS5kaW0xMHgxMCwgY2c6IFwiY2ctNjQwLTY0MFwiLCBib2FyZDogXCJib2FyZDEweDEwXCIsIEJvYXJkQ1NTOiBbXCIxMHgxMGJyb3duXCIsIFwiMTB4MTBibHVlXCIsIFwiMTB4MTBncmVlblwiLCBcIjEweDEwbWFwbGVcIiwgXCIxMHgxMG9saXZlXCJdLCBwaWVjZXM6IFwiY2FwYVwiLCBQaWVjZUNTUzogW1wiY2FwYTBcIiwgXCJjYXBhMVwiLCBcImNhcGEyXCIsIFwiY2FwYTNcIl0sIGljb246IFwiR1wiIH0sXHJcbiAgICBncmFuZGhvdXNlOiB7IGdlb206IEdlb21ldHJ5LmRpbTEweDEwLCBjZzogXCJjZy02NDAtNjQwXCIsIGJvYXJkOiBcImJvYXJkMTB4MTBcIiwgQm9hcmRDU1M6IFtcIjEweDEwYnJvd25cIiwgXCIxMHgxMGJsdWVcIiwgXCIxMHgxMGdyZWVuXCIsIFwiMTB4MTBtYXBsZVwiLCBcIjEweDEwb2xpdmVcIl0sIHBpZWNlczogXCJjYXBhXCIsIFBpZWNlQ1NTOiBbXCJjYXBhMFwiLCBcImNhcGExXCIsIFwiY2FwYTJcIiwgXCJjYXBhM1wiXSwgaWNvbjogXCJHXCIgfSxcclxuICAgIHNlaXJhd2FuOiB7IGdlb206IEdlb21ldHJ5LmRpbTh4OCwgY2c6IFwiY2ctNTEyXCIsIGJvYXJkOiBcImJvYXJkOHg4XCIsIEJvYXJkQ1NTOiBbXCI4eDhicm93blwiLCBcIjh4OGJsdWVcIiwgXCI4eDhncmVlblwiLCBcIjh4OG1hcGxlXCIsIFwiOHg4b2xpdmVcIl0sIHBpZWNlczogXCJzZWlyYXdhblwiLCBQaWVjZUNTUzogW1wic2VpcjFcIiwgXCJzZWlyMFwiLCBcInNlaXIyXCIsIFwic2VpcjNcIl0sIGljb246IFwiTFwiIH0sXHJcbiAgICBzaG91c2U6IHsgZ2VvbTogR2VvbWV0cnkuZGltOHg4LCBjZzogXCJjZy01MTJcIiwgYm9hcmQ6IFwiYm9hcmQ4eDhcIiwgQm9hcmRDU1M6IFtcIjh4OGJyb3duXCIsIFwiOHg4Ymx1ZVwiLCBcIjh4OGdyZWVuXCIsIFwiOHg4bWFwbGVcIiwgXCI4eDhvbGl2ZVwiXSwgcGllY2VzOiBcInNlaXJhd2FuXCIsIFBpZWNlQ1NTOiBbXCJzZWlyMVwiLCBcInNlaXIwXCIsIFwic2VpcjJcIiwgXCJzZWlyM1wiXSwgaWNvbjogXCJMXCIgfSxcclxuICAgIHN0YW5kYXJkOiB7IGdlb206IEdlb21ldHJ5LmRpbTh4OCwgY2c6IFwiY2ctNTEyXCIsIGJvYXJkOiBcImJvYXJkOHg4XCIsIEJvYXJkQ1NTOiBbXCI4eDhicm93blwiLCBcIjh4OGJsdWVcIiwgXCI4eDhncmVlblwiLCBcIjh4OG1hcGxlXCIsIFwiOHg4b2xpdmVcIl0sIHBpZWNlczogXCJzdGFuZGFyZFwiLCBQaWVjZUNTUzogW1wic3RhbmRhcmRcIiwgXCJncmVlblwiLCBcImFscGhhXCJdLCBpY29uOiBcIk1cIiB9LFxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcG9ja2V0Um9sZXModmFyaWFudDogc3RyaW5nKSB7XHJcbiAgICBzd2l0Y2ggKHZhcmlhbnQpIHtcclxuICAgIGNhc2UgXCJzaXR0dXlpblwiOlxyXG4gICAgICAgIHJldHVybiBbXCJyb29rXCIsIFwia25pZ2h0XCIsIFwic2lsdmVyXCIsIFwiZmVyelwiLCBcImtpbmdcIl07XHJcbiAgICBjYXNlIFwiY3Jhenlob3VzZVwiOlxyXG4gICAgICAgIHJldHVybiBbXCJwYXduXCIsIFwia25pZ2h0XCIsIFwiYmlzaG9wXCIsIFwicm9va1wiLCBcInF1ZWVuXCJdO1xyXG4gICAgY2FzZSBcImdyYW5kaG91c2VcIjpcclxuICAgIGNhc2UgXCJjYXBhaG91c2VcIjpcclxuICAgICAgICByZXR1cm4gW1wicGF3blwiLCBcImtuaWdodFwiLCBcImJpc2hvcFwiLCBcInJvb2tcIiwgXCJxdWVlblwiLCBcImFyY2hiaXNob3BcIiwgXCJjYW5jZWxsb3JcIl07XHJcbiAgICBjYXNlIFwic2hvZ2lcIjpcclxuICAgICAgICByZXR1cm4gW1wicGF3blwiLCBcImxhbmNlXCIsIFwia25pZ2h0XCIsIFwiYmlzaG9wXCIsIFwicm9va1wiLCBcInNpbHZlclwiLCBcImdvbGRcIl07XHJcbiAgICBjYXNlIFwic2hvdXNlXCI6XHJcbiAgICAgICAgcmV0dXJuIFtcInBhd25cIiwgXCJrbmlnaHRcIiwgXCJiaXNob3BcIiwgXCJyb29rXCIsIFwicXVlZW5cIiwgXCJlbGVwaGFudFwiLCBcImhhd2tcIl07XHJcbiAgICBjYXNlIFwic2VpcmF3YW5cIjpcclxuICAgICAgICByZXR1cm4gW1wiZWxlcGhhbnRcIiwgXCJoYXdrXCJdO1xyXG4gICAgZGVmYXVsdDpcclxuICAgICAgICByZXR1cm4gW1wicm9va1wiLCBcImtuaWdodFwiLCBcImJpc2hvcFwiLCBcInF1ZWVuXCIsIFwia2luZ1wiXTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcHJvbW90aW9uWm9uZSh2YXJpYW50OiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcpIHtcclxuICAgIHN3aXRjaCAodmFyaWFudCkge1xyXG4gICAgY2FzZSAnc2hvZ2knOlxyXG4gICAgICAgIHJldHVybiBjb2xvciA9PT0gJ3doaXRlJyA/ICdhOWI5YzlkOWU5ZjlnOWg5aTlhOGI4YzhkOGU4ZjhnOGg4aThhN2I3YzdkN2U3ZjdnN2g3aTcnIDogJ2ExYjFjMWQxZTFmMWcxaDFpMWEyYjJjMmQyZTJmMmcyaDJpMmEzYjNjM2QzZTNmM2czaDNpMyc7XHJcbiAgICBjYXNlICdtYWtydWsnOlxyXG4gICAgICAgIHJldHVybiBjb2xvciA9PT0gJ3doaXRlJyA/ICdhNmI2YzZkNmU2ZjZnNmg2JyA6ICdhM2IzYzNkM2UzZjNnM2gzJztcclxuICAgIGNhc2UgJ3NpdHR1eWluJzpcclxuICAgICAgICByZXR1cm4gY29sb3IgPT09ICd3aGl0ZScgPyAnYThiN2M2ZDVlNWY2ZzdoOCcgOiAnYTFiMmMzZDRlNGYzZzJoMSc7XHJcbiAgICBkZWZhdWx0OlxyXG4gICAgICAgIHJldHVybiBjb2xvciA9PT0gJ3doaXRlJyA/ICdhOGI4YzhkOGU4ZjhnOGg4aThqOCcgOiAnYTFiMWMxZDFlMWYxZzFoMWkxajEnO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcHJvbW90aW9uUm9sZXModmFyaWFudDogc3RyaW5nLCByb2xlOiBSb2xlLCBvcmlnOiBLZXksIGRlc3Q6IEtleSwgcHJvbW90aW9ucykge1xyXG4gICAgc3dpdGNoICh2YXJpYW50KSB7XHJcbiAgICBjYXNlIFwiY2FwYWhvdXNlXCI6XHJcbiAgICBjYXNlIFwiY2FwYWJsYW5jYVwiOlxyXG4gICAgICAgIHJldHVybiBbXCJxdWVlblwiLCBcImtuaWdodFwiLCBcInJvb2tcIiwgXCJiaXNob3BcIiwgXCJhcmNoYmlzaG9wXCIsIFwiY2FuY2VsbG9yXCJdO1xyXG4gICAgY2FzZSBcInNob3VzZVwiOlxyXG4gICAgY2FzZSBcInNlaXJhd2FuXCI6XHJcbiAgICAgICAgcmV0dXJuIFtcInF1ZWVuXCIsIFwia25pZ2h0XCIsIFwicm9va1wiLCBcImJpc2hvcFwiLCBcImVsZXBoYW50XCIsIFwiaGF3a1wiXTtcclxuICAgIGNhc2UgXCJzaG9naVwiOlxyXG4gICAgICAgIHJldHVybiBbXCJwXCIgKyByb2xlLCByb2xlXTtcclxuICAgIGNhc2UgXCJncmFuZGhvdXNlXCI6XHJcbiAgICBjYXNlIFwiZ3JhbmRcIjpcclxuICAgICAgICB2YXIgcm9sZXM6IFJvbGVbXSA9IFtdO1xyXG4gICAgICAgIGNvbnN0IG1vdmVzID0gcHJvbW90aW9ucy5tYXAoKG1vdmUpID0+IG1vdmUuc2xpY2UoMCwgLTEpKTtcclxuICAgICAgICBwcm9tb3Rpb25zLmZvckVhY2goKG1vdmUpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgcHJvbGUgPSBzYW5Ub1JvbGVbbW92ZS5zbGljZSgtMSldO1xyXG4gICAgICAgICAgICBpZiAobW92ZXMuaW5kZXhPZihvcmlnICsgZGVzdCkgIT09IC0xICYmIHJvbGVzLmluZGV4T2YocHJvbGUpID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgcm9sZXMucHVzaChwcm9sZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICAvLyBwcm9tb3Rpb24gaXMgb3B0aW9uYWwgZXhjZXB0IG9uIGJhY2sgcmFua3NcclxuICAgICAgICBpZiAoKGRlc3RbMV0gIT09IFwiOVwiKSAmJiAoZGVzdFsxXSAhPT0gXCIwXCIpKSByb2xlcy5wdXNoKHJvbGUpO1xyXG4gICAgICAgIHJldHVybiByb2xlcztcclxuICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgcmV0dXJuIFtcInF1ZWVuXCIsIFwia25pZ2h0XCIsIFwicm9va1wiLCBcImJpc2hvcFwiXTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG1hbmRhdG9yeVByb21vdGlvbihyb2xlOiBSb2xlLCBkZXN0OiBLZXksIGNvbG9yOiBDb2xvcikge1xyXG4gICAgc3dpdGNoIChyb2xlKSB7XHJcbiAgICBjYXNlIFwicGF3blwiOlxyXG4gICAgY2FzZSBcImxhbmNlXCI6XHJcbiAgICAgICAgaWYgKGNvbG9yID09PSBcIndoaXRlXCIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGRlc3RbMV0gPT09IFwiOVwiO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBkZXN0WzFdID09PSBcIjFcIjtcclxuICAgICAgICB9XHJcbiAgICBjYXNlIFwia25pZ2h0XCI6XHJcbiAgICAgICAgaWYgKGNvbG9yID09PSBcIndoaXRlXCIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGRlc3RbMV0gPT09IFwiOVwiIHx8IGRlc3RbMV0gPT09IFwiOFwiO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBkZXN0WzFdID09PSBcIjFcIiB8fCBkZXN0WzFdID09PSBcIjJcIjtcclxuICAgICAgICB9XHJcbiAgICBkZWZhdWx0OlxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG5lZWRQb2NrZXRzKHZhcmlhbnQ6IHN0cmluZykge1xyXG4gICAgcmV0dXJuIHZhcmlhbnQgPT09ICdwbGFjZW1lbnQnIHx8IHZhcmlhbnQgPT09ICdjcmF6eWhvdXNlJyB8fCB2YXJpYW50ID09PSAnc2l0dHV5aW4nIHx8IHZhcmlhbnQgPT09ICdzaG9naScgfHwgdmFyaWFudCA9PT0gJ3NlaXJhd2FuJyB8fCB2YXJpYW50ID09PSAnY2FwYWhvdXNlJyB8fCB2YXJpYW50ID09PSAnc2hvdXNlJyB8fCB2YXJpYW50ID09PSAnZ3JhbmRob3VzZSc7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBoYXNFcCh2YXJpYW50OiBzdHJpbmcpIHtcclxuICAgIHJldHVybiB2YXJpYW50ID09PSAnc3RhbmRhcmQnIHx8IHZhcmlhbnQgPT09ICdwbGFjZW1lbnQnIHx8IHZhcmlhbnQgPT09ICdjcmF6eWhvdXNlJyB8fCB2YXJpYW50ID09PSAnY2FwYWJsYW5jYScgfHwgdmFyaWFudCA9PT0gJ3NlaXJhd2FuJyB8fCB2YXJpYW50ID09PSAnY2FwYWhvdXNlJyB8fCB2YXJpYW50ID09PSAnc2hvdXNlJyB8fCB2YXJpYW50ID09PSAnZ3JhbmQnIHx8IHZhcmlhbnQgPT09ICdncmFuZGhvdXNlJztcclxufVxyXG5cclxuZnVuY3Rpb24gZGlmZihhOiBudW1iZXIsIGI6bnVtYmVyKTpudW1iZXIge1xyXG4gIHJldHVybiBNYXRoLmFicyhhIC0gYik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRpYWdvbmFsTW92ZShwb3MxLCBwb3MyKSB7XHJcbiAgICBjb25zdCB4ZCA9IGRpZmYocG9zMVswXSwgcG9zMlswXSk7XHJcbiAgICBjb25zdCB5ZCA9IGRpZmYocG9zMVsxXSwgcG9zMlsxXSk7XHJcbiAgICByZXR1cm4geGQgPT09IHlkICYmIHhkID09PSAxO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2FuR2F0ZShmZW4sIHBpZWNlLCBvcmlnLCBkZXN0LCBtZXRhKSB7XHJcbiAgICBjb25zb2xlLmxvZyhcIiAgIGlzR2F0aW5nKClcIiwgZmVuLCBwaWVjZSwgb3JpZywgZGVzdCwgbWV0YSk7XHJcbiAgICBjb25zdCBub19nYXRlID0gW2ZhbHNlLCBmYWxzZSwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgZmFsc2VdXHJcbiAgICBpZiAoKHBpZWNlLmNvbG9yID09PSBcIndoaXRlXCIgJiYgb3JpZy5zbGljZSgxKSAhPT0gXCIxXCIpIHx8XHJcbiAgICAgICAgKHBpZWNlLmNvbG9yID09PSBcImJsYWNrXCIgJiYgb3JpZy5zbGljZSgxKSAhPT0gXCI4XCIpIHx8XHJcbiAgICAgICAgKHBpZWNlLnJvbGUgPT09IFwiaGF3a1wiKSB8fFxyXG4gICAgICAgIChwaWVjZS5yb2xlID09PSBcImVsZXBoYW50XCIpKSByZXR1cm4gbm9fZ2F0ZTtcclxuXHJcbiAgICAvLyBJbiBzdGFydGluZyBwb3NpdGlvbiBraW5nIGFuZCghKSByb29rIHZpcmdpbml0eSBpcyBlbmNvZGVkIGluIEtRa3FcclxuICAgIC8vIFwicm5icWtibnIvcHBwcHBwcHAvOC84LzgvOC9QUFBQUFBQUC9STkJRS0JOUltIRWhlXSB3IEtRQkNERkdrcWJjZGZnIC0gMCAxXCJcclxuXHJcbiAgICAvLyBidXQgYWZ0ZXIga2luZ3MgbW92ZWQgcm9vayB2aXJnaW5pdHkgaXMgZW5jb2RlZCBpbiBBSGFoXHJcbiAgICAvLyBybmJxMWJuci9wcHBwa3BwcC84LzRwMy80UDMvOC9QUFBQS1BQUC9STkJRMUJOUltIRWhlXSB3IEFCQ0RGR0hhYmNkZmdoIC0gMiAzXHJcblxyXG4gICAgLy8ga2luZyB2aXJnaW5pdHkgaXMgZW5jb2RlZCBpbiBFZSBhZnRlciBhbnkgUm9vayBtb3ZlZCBidXQgS2luZyBub3RcclxuXHJcbiAgICBjb25zdCBwYXJ0cyA9IGZlbi5zcGxpdChcIiBcIik7XHJcbiAgICBjb25zdCBwbGFjZW1lbnQgPSBwYXJ0c1swXTtcclxuICAgIGNvbnN0IGNvbG9yID0gcGFydHNbMV07XHJcbiAgICBjb25zdCBjYXN0bCA9IHBhcnRzWzJdO1xyXG4gICAgLy8gY29uc29sZS5sb2coXCJpc0dhdGluZygpXCIsIG9yaWcsIHBsYWNlbWVudCwgY29sb3IsIGNhc3RsKTtcclxuICAgIHN3aXRjaCAob3JpZykge1xyXG4gICAgY2FzZSBcImExXCI6XHJcbiAgICAgICAgaWYgKGNhc3RsLmluZGV4T2YoXCJBXCIpID09PSAtMSAmJiBjYXN0bC5pbmRleE9mKFwiUVwiKSA9PT0gLTEpIHJldHVybiBub19nYXRlO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSBcImIxXCI6XHJcbiAgICAgICAgaWYgKGNhc3RsLmluZGV4T2YoXCJCXCIpID09PSAtMSkgcmV0dXJuIG5vX2dhdGU7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICBjYXNlIFwiYzFcIjpcclxuICAgICAgICBpZiAoY2FzdGwuaW5kZXhPZihcIkNcIikgPT09IC0xKSByZXR1cm4gbm9fZ2F0ZTtcclxuICAgICAgICBicmVhaztcclxuICAgIGNhc2UgXCJkMVwiOlxyXG4gICAgICAgIGlmIChjYXN0bC5pbmRleE9mKFwiRFwiKSA9PT0gLTEpIHJldHVybiBub19nYXRlO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSBcImUxXCI6XHJcbiAgICAgICAgaWYgKHBpZWNlLnJvbGUgIT09IFwia2luZ1wiKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBub19nYXRlO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoKGNhc3RsLmluZGV4T2YoXCJLXCIpID09PSAtMSkgJiYgKGNhc3RsLmluZGV4T2YoXCJRXCIpID09PSAtMSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5vX2dhdGU7XHJcbiAgICAgICAgfSBlbHNlIGlmIChjYXN0bC5pbmRleE9mKFwiRVwiKSA9PT0gLTEpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5vX2dhdGU7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBicmVhaztcclxuICAgIGNhc2UgXCJmMVwiOlxyXG4gICAgICAgIGlmIChjYXN0bC5pbmRleE9mKFwiRlwiKSA9PT0gLTEpIHJldHVybiBub19nYXRlO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSBcImcxXCI6XHJcbiAgICAgICAgaWYgKGNhc3RsLmluZGV4T2YoXCJHXCIpID09PSAtMSkgcmV0dXJuIG5vX2dhdGU7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICBjYXNlIFwiaDFcIjpcclxuICAgICAgICBpZiAoY2FzdGwuaW5kZXhPZihcIkhcIikgPT09IC0xICYmIGNhc3RsLmluZGV4T2YoXCJLXCIpID09PSAtMSkgcmV0dXJuIG5vX2dhdGU7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICBjYXNlIFwiYThcIjpcclxuICAgICAgICBpZiAoY2FzdGwuaW5kZXhPZihcImFcIikgPT09IC0xICYmIGNhc3RsLmluZGV4T2YoXCJxXCIpID09PSAtMSkgcmV0dXJuIG5vX2dhdGU7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICBjYXNlIFwiYjhcIjpcclxuICAgICAgICBpZiAoY2FzdGwuaW5kZXhPZihcImJcIikgPT09IC0xKSByZXR1cm4gbm9fZ2F0ZTtcclxuICAgICAgICBicmVhaztcclxuICAgIGNhc2UgXCJjOFwiOlxyXG4gICAgICAgIGlmIChjYXN0bC5pbmRleE9mKFwiY1wiKSA9PT0gLTEpIHJldHVybiBub19nYXRlO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSBcImQ4XCI6XHJcbiAgICAgICAgaWYgKGNhc3RsLmluZGV4T2YoXCJkXCIpID09PSAtMSkgcmV0dXJuIG5vX2dhdGU7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICBjYXNlIFwiZThcIjpcclxuICAgICAgICBpZiAocGllY2Uucm9sZSAhPT0gXCJraW5nXCIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5vX2dhdGU7XHJcbiAgICAgICAgfSBlbHNlIGlmICgoY2FzdGwuaW5kZXhPZihcImtcIikgPT09IC0xKSAmJiAoY2FzdGwuaW5kZXhPZihcInFcIikgPT09IC0xKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbm9fZ2F0ZTtcclxuICAgICAgICB9IGVsc2UgaWYgKGNhc3RsLmluZGV4T2YoXCJlXCIpID09PSAtMSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbm9fZ2F0ZTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSBcImY4XCI6XHJcbiAgICAgICAgaWYgKGNhc3RsLmluZGV4T2YoXCJmXCIpID09PSAtMSkgcmV0dXJuIG5vX2dhdGU7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICBjYXNlIFwiZzhcIjpcclxuICAgICAgICBpZiAoY2FzdGwuaW5kZXhPZihcImdcIikgPT09IC0xKSByZXR1cm4gbm9fZ2F0ZTtcclxuICAgICAgICBicmVhaztcclxuICAgIGNhc2UgXCJoOFwiOlxyXG4gICAgICAgIGlmIChjYXN0bC5pbmRleE9mKFwiaFwiKSA9PT0gLTEgJiYgY2FzdGwuaW5kZXhPZihcImtcIikgPT09IC0xKSByZXR1cm4gbm9fZ2F0ZTtcclxuICAgICAgICBicmVhaztcclxuICAgIH07XHJcbiAgICBjb25zdCBicmFja2V0UG9zID0gcGxhY2VtZW50LmluZGV4T2YoXCJbXCIpO1xyXG4gICAgY29uc3QgcG9ja2V0cyA9IHBsYWNlbWVudC5zbGljZShicmFja2V0UG9zKTtcclxuICAgIGNvbnN0IHBoID0gbGMocG9ja2V0cywgXCJoXCIsIGNvbG9yPT09J3cnKSAhPT0gMDtcclxuICAgIGNvbnN0IHBlID0gbGMocG9ja2V0cywgXCJlXCIsIGNvbG9yPT09J3cnKSAhPT0gMDtcclxuICAgIGNvbnN0IHBxID0gbGMocG9ja2V0cywgXCJxXCIsIGNvbG9yPT09J3cnKSAhPT0gMDtcclxuICAgIGNvbnN0IHByID0gbGMocG9ja2V0cywgXCJyXCIsIGNvbG9yPT09J3cnKSAhPT0gMDtcclxuICAgIGNvbnN0IHBiID0gbGMocG9ja2V0cywgXCJiXCIsIGNvbG9yPT09J3cnKSAhPT0gMDtcclxuICAgIGNvbnN0IHBuID0gbGMocG9ja2V0cywgXCJuXCIsIGNvbG9yPT09J3cnKSAhPT0gMDtcclxuXHJcbiAgICByZXR1cm4gW3BoLCBwZSwgcHEsIHByLCBwYiwgcG5dO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gaXNQcm9tb3Rpb24odmFyaWFudCwgcGllY2UsIG9yaWcsIGRlc3QsIG1ldGEsIHByb21vdGlvbnMpIHtcclxuICAgIGlmICh2YXJpYW50ID09PSAneGlhbmdxaScpIHJldHVybiBmYWxzZTtcclxuICAgIGNvbnN0IHB6ID0gcHJvbW90aW9uWm9uZSh2YXJpYW50LCBwaWVjZS5jb2xvcilcclxuICAgIHN3aXRjaCAodmFyaWFudCkge1xyXG4gICAgY2FzZSAnc2hvZ2knOlxyXG4gICAgICAgIHJldHVybiBbJ2tpbmcnLCAnZ29sZCcsICdwcGF3bicsICdwa25pZ2h0JywgJ3BiaXNob3AnLCAncHJvb2snLCAncHNpbHZlcicsICdwbGFuY2UnXS5pbmRleE9mKHBpZWNlLnJvbGUpID09PSAtMVxyXG4gICAgICAgICAgICAmJiAocHouaW5kZXhPZihvcmlnKSAhPT0gLTEgfHwgcHouaW5kZXhPZihkZXN0KSAhPT0gLTEpO1xyXG4gICAgY2FzZSAnc2l0dHV5aW4nOlxyXG4gICAgICAgIC8vIFNlZSBodHRwczovL3Zkb2N1bWVudHMubmV0L2hvdy10by1wbGF5LW15YW5tYXItdHJhZGl0aW9uYWwtY2hlc3MtZW5nLWJvb2stMS5odG1sXHJcbiAgICAgICAgY29uc3QgZmlyc3RSYW5rSXMwID0gZmFsc2U7XHJcbiAgICAgICAgY29uc3QgZG0gPSBkaWFnb25hbE1vdmUoa2V5MnBvcyhvcmlnLCBmaXJzdFJhbmtJczApLCBrZXkycG9zKGRlc3QsIGZpcnN0UmFua0lzMCkpO1xyXG4gICAgICAgIHJldHVybiBwaWVjZS5yb2xlID09PSBcInBhd25cIiAmJiAoIG9yaWcgPT09IGRlc3QgfHwgKCFtZXRhLmNhcHR1cmVkICYmIGRtKSk7XHJcbiAgICBjYXNlICdncmFuZGhvdXNlJzpcclxuICAgIGNhc2UgJ2dyYW5kJzpcclxuICAgICAgICAvLyBUT0RPOiB3ZSBjYW4gdXNlIHRoaXMgZm9yIG90aGVyIHZhcmlhbnRzIGFsc29cclxuICAgICAgICByZXR1cm4gcHJvbW90aW9ucy5tYXAoKG1vdmUpID0+IG1vdmUuc2xpY2UoMCwgLTEpKS5pbmRleE9mKG9yaWcgKyBkZXN0KSAhPT0gLTE7XHJcbiAgICBkZWZhdWx0OlxyXG4gICAgICAgIHJldHVybiBwaWVjZS5yb2xlID09PSBcInBhd25cIiAmJiBwei5pbmRleE9mKGRlc3QpICE9PSAtMTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHVjaTJ1c2kobW92ZSkge1xyXG4gICAgY29uc3QgcGFydHMgPSBtb3ZlLnNwbGl0KFwiXCIpO1xyXG4gICAgaWYgKHBhcnRzWzFdID09PSBcIkBcIikge1xyXG4gICAgICAgIHBhcnRzWzFdID0gXCIqXCI7XHJcbiAgICAgICAgcGFydHNbMl0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHBhcnRzWzJdLmNoYXJDb2RlQXQoKSAtIDQ4KVxyXG4gICAgICAgIHBhcnRzWzNdID0gU3RyaW5nLmZyb21DaGFyQ29kZShwYXJ0c1szXS5jaGFyQ29kZUF0KCkgKyA0OClcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcGFydHNbMF0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHBhcnRzWzBdLmNoYXJDb2RlQXQoKSAtIDQ4KVxyXG4gICAgICAgIHBhcnRzWzFdID0gU3RyaW5nLmZyb21DaGFyQ29kZShwYXJ0c1sxXS5jaGFyQ29kZUF0KCkgKyA0OClcclxuICAgICAgICBwYXJ0c1syXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocGFydHNbMl0uY2hhckNvZGVBdCgpIC0gNDgpXHJcbiAgICAgICAgcGFydHNbM10gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHBhcnRzWzNdLmNoYXJDb2RlQXQoKSArIDQ4KVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHBhcnRzLmpvaW4oXCJcIik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB1c2kydWNpKG1vdmUpIHtcclxuICAgIGNvbnNvbGUubG9nKFwidXNpMnVjaSgpXCIsIG1vdmUpO1xyXG4gICAgY29uc3QgcGFydHMgPSBtb3ZlLnNwbGl0KFwiXCIpO1xyXG4gICAgaWYgKHBhcnRzWzFdID09PSBcIipcIikge1xyXG4gICAgICAgIHBhcnRzWzFdID0gXCJAXCI7XHJcbiAgICAgICAgcGFydHNbMl0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHBhcnRzWzJdLmNoYXJDb2RlQXQoKSArIDQ4KVxyXG4gICAgICAgIHBhcnRzWzNdID0gU3RyaW5nLmZyb21DaGFyQ29kZShwYXJ0c1szXS5jaGFyQ29kZUF0KCkgLSA0OClcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcGFydHNbMF0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHBhcnRzWzBdLmNoYXJDb2RlQXQoKSArIDQ4KVxyXG4gICAgICAgIHBhcnRzWzFdID0gU3RyaW5nLmZyb21DaGFyQ29kZShwYXJ0c1sxXS5jaGFyQ29kZUF0KCkgLSA0OClcclxuICAgICAgICBwYXJ0c1syXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUocGFydHNbMl0uY2hhckNvZGVBdCgpICsgNDgpXHJcbiAgICAgICAgcGFydHNbM10gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHBhcnRzWzNdLmNoYXJDb2RlQXQoKSAtIDQ4KVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHBhcnRzLmpvaW4oXCJcIik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB6ZXJvMmdyYW5kKG1vdmUpIHtcclxuICAgIGNvbnN0IHBhcnRzID0gbW92ZS5zcGxpdChcIlwiKTtcclxuICAgIGlmIChwYXJ0c1sxXSAhPT0gXCJAXCIpIHtcclxuICAgICAgICBwYXJ0c1sxXSA9IFN0cmluZyhOdW1iZXIocGFydHNbMV0pICsgMSk7XHJcbiAgICB9XHJcbiAgICBwYXJ0c1szXSA9IFN0cmluZyhOdW1iZXIocGFydHNbM10pICsgMSk7XHJcbiAgICByZXR1cm4gcGFydHMuam9pbihcIlwiKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdyYW5kMnplcm8obW92ZSkge1xyXG4gICAgLy8gY3V0IG9mZiBwcm9tb3Rpb24gcGllY2UgbGV0dGVyXHJcbiAgICB2YXIgcHJvbW8gPSAnJztcclxuICAgIGlmICgnMDEyMzQ1Njc4OScuaW5kZXhPZihtb3ZlLnNsaWNlKC0xKSkgPT09IC0xKSB7XHJcbiAgICAgICAgcHJvbW8gPSBtb3ZlLnNsaWNlKC0xKTtcclxuICAgICAgICBtb3ZlID0gbW92ZS5zbGljZSgwLCAtMSk7XHJcbiAgICB9XHJcbiAgICBjb25zdCBwYXJ0cyA9IG1vdmUuc3BsaXQoXCJcIik7XHJcblxyXG4gICAgaWYgKHBhcnRzWzFdID09PSAnQCcpIHtcclxuICAgICAgICByZXR1cm4gcGFydHNbMF0gKyBwYXJ0c1sxXSArIHBhcnRzWzJdICsgU3RyaW5nKE51bWJlcihtb3ZlLnNsaWNlKDMpKSAtIDEpO1xyXG4gICAgfVxyXG4gICAgaWYgKCcwMTIzNDU2Nzg5Jy5pbmRleE9mKHBhcnRzWzJdKSAhPT0gLTEpIHtcclxuICAgICAgICBwYXJ0c1sxXSA9IFN0cmluZyhOdW1iZXIocGFydHNbMV0gKyBwYXJ0c1syXSkgLTEpO1xyXG4gICAgICAgIHBhcnRzWzRdID0gU3RyaW5nKE51bWJlcihtb3ZlLnNsaWNlKDQpKSAtIDEpO1xyXG4gICAgICAgIHJldHVybiBwYXJ0c1swXSArIHBhcnRzWzFdICsgcGFydHNbM10gKyBwYXJ0c1s0XSArIHByb21vO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBwYXJ0c1sxXSA9IFN0cmluZyhOdW1iZXIocGFydHNbMV0pIC0xKTtcclxuICAgICAgICBwYXJ0c1szXSA9IFN0cmluZyhOdW1iZXIobW92ZS5zbGljZSgzKSkgLSAxKTtcclxuICAgICAgICByZXR1cm4gcGFydHNbMF0gKyBwYXJ0c1sxXSArIHBhcnRzWzJdICsgcGFydHNbM10gKyBwcm9tbztcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IHJvbGVUb1NhbiA9IHtcclxuICAgIHBhd246ICdQJyxcclxuICAgIGtuaWdodDogJ04nLFxyXG4gICAgYmlzaG9wOiAnQicsXHJcbiAgICByb29rOiAnUicsXHJcbiAgICBxdWVlbjogJ1EnLFxyXG4gICAga2luZzogJ0snLFxyXG4gICAgYXJjaGJpc2hvcDogJ0EnLFxyXG4gICAgY2FuY2VsbG9yOiAnQycsXHJcbiAgICBlbGVwaGFudDogXCJFXCIsXHJcbiAgICBoYXdrOiBcIkhcIixcclxuICAgIGZlcno6ICdGJyxcclxuICAgIG1ldDogJ00nLFxyXG4gICAgZ29sZDogJ0cnLFxyXG4gICAgc2lsdmVyOiAnUycsXHJcbiAgICBsYW5jZTogJ0wnLFxyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IHNhblRvUm9sZSA9IHtcclxuICAgIFA6ICdwYXduJyxcclxuICAgIE46ICdrbmlnaHQnLFxyXG4gICAgQjogJ2Jpc2hvcCcsXHJcbiAgICBSOiAncm9vaycsXHJcbiAgICBROiAncXVlZW4nLFxyXG4gICAgSzogJ2tpbmcnLFxyXG4gICAgQTogJ2FyY2hiaXNob3AnLFxyXG4gICAgQzogJ2NhbmNlbGxvcicsXHJcbiAgICBFOiAnZWxlcGhhbnQnLFxyXG4gICAgSDogJ2hhd2snLFxyXG4gICAgRjogJ2ZlcnonLFxyXG4gICAgTTogJ21ldCcsXHJcbiAgICBHOiAnZ29sZCcsXHJcbiAgICBTOiAnc2lsdmVyJyxcclxuICAgIEw6ICdsYW5jZScsXHJcbiAgICBwOiAncGF3bicsXHJcbiAgICBuOiAna25pZ2h0JyxcclxuICAgIGI6ICdiaXNob3AnLFxyXG4gICAgcjogJ3Jvb2snLFxyXG4gICAgcTogJ3F1ZWVuJyxcclxuICAgIGs6ICdraW5nJyxcclxuICAgIGE6ICdhcmNoYmlzaG9wJyxcclxuICAgIGM6ICdjYW5jZWxsb3InLFxyXG4gICAgZTogJ2VsZXBoYW50JyxcclxuICAgIGg6ICdoYXdrJyxcclxuICAgIGY6ICdmZXJ6JyxcclxuICAgIG06ICdtZXQnLFxyXG4gICAgZzogJ2dvbGQnLFxyXG4gICAgczogJ3NpbHZlcicsXHJcbiAgICBsOiAnbGFuY2UnLFxyXG59O1xyXG5cclxuLy8gQ291bnQgZ2l2ZW4gbGV0dGVyIG9jY3VyZW5jZXMgaW4gYSBzdHJpbmdcclxuZXhwb3J0IGZ1bmN0aW9uIGxjKHN0ciwgbGV0dGVyLCB1cHBlcmNhc2UpIHtcclxuICAgIHZhciBsZXR0ZXJDb3VudCA9IDA7XHJcbiAgICBpZiAodXBwZXJjYXNlKSBsZXR0ZXIgPSBsZXR0ZXIudG9VcHBlckNhc2UoKTtcclxuICAgIGZvciAodmFyIHBvc2l0aW9uID0gMDsgcG9zaXRpb24gPCBzdHIubGVuZ3RoOyBwb3NpdGlvbisrKSB7XHJcbiAgICAgICAgaWYgKHN0ci5jaGFyQXQocG9zaXRpb24pID09PSBsZXR0ZXIpIGxldHRlckNvdW50ICs9IDE7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbGV0dGVyQ291bnQ7XHJcbn1cclxuIiwiLy8gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMjA2MTgzNTUvdGhlLXNpbXBsZXN0LXBvc3NpYmxlLWphdmFzY3JpcHQtY291bnRkb3duLXRpbWVyXG5cbmltcG9ydCB7IGgsIGluaXQgfSBmcm9tIFwic25hYmJkb21cIjtcbmltcG9ydCBrbGFzcyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL2NsYXNzJztcbmltcG9ydCBhdHRyaWJ1dGVzIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvYXR0cmlidXRlcyc7XG5pbXBvcnQgcHJvcGVydGllcyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL3Byb3BzJztcbmltcG9ydCBsaXN0ZW5lcnMgZnJvbSAnc25hYmJkb20vbW9kdWxlcy9ldmVudGxpc3RlbmVycyc7XG5cbmNvbnN0IHBhdGNoID0gaW5pdChba2xhc3MsIGF0dHJpYnV0ZXMsIHByb3BlcnRpZXMsIGxpc3RlbmVyc10pO1xuXG5leHBvcnQgY2xhc3MgQ2xvY2sge1xuICAgIGR1cmF0aW9uOiBudW1iZXI7XG4gICAgaW5jcmVtZW50OiBudW1iZXI7XG4gICAgZ3JhbnVsYXJpdHk6IG51bWJlcjtcbiAgICBydW5uaW5nOiBib29sZWFuO1xuICAgIGNvbm5lY3Rpbmc6IGJvb2xlYW47XG4gICAgdGltZW91dDogYW55O1xuICAgIHN0YXJ0VGltZTogYW55O1xuICAgIHRpY2tDYWxsYmFja3M6IGFueVtdO1xuICAgIGZsYWdDYWxsYmFjazogYW55O1xuICAgIGVsOiBIVE1MRWxlbWVudDtcbiAgICBpZDogc3RyaW5nO1xuXG4gICAgLy8gZ2FtZSBiYXNlVGltZSAobWluKSBhbmQgaW5jcmVtZW50IChzZWMpXG4gICAgY29uc3RydWN0b3IoYmFzZVRpbWUsIGluY3JlbWVudCwgZWwsIGlkKSB7XG4gICAgdGhpcy5kdXJhdGlvbiA9IGJhc2VUaW1lICogMTAwMCAqIDYwO1xuICAgIHRoaXMuaW5jcmVtZW50ID0gaW5jcmVtZW50ICogMTAwMDtcbiAgICB0aGlzLmdyYW51bGFyaXR5ID0gNTAwO1xuICAgIHRoaXMucnVubmluZyA9IGZhbHNlO1xuICAgIHRoaXMuY29ubmVjdGluZyA9IGZhbHNlO1xuICAgIHRoaXMudGltZW91dCA9IG51bGw7XG4gICAgdGhpcy5zdGFydFRpbWUgPSBudWxsO1xuICAgIHRoaXMudGlja0NhbGxiYWNrcyA9IFtdO1xuICAgIHRoaXMuZmxhZ0NhbGxiYWNrID0gbnVsbDtcbiAgICB0aGlzLmVsID0gZWw7XG4gICAgdGhpcy5pZCA9IGlkO1xuXG4gICAgcmVuZGVyVGltZSh0aGlzLCB0aGlzLmR1cmF0aW9uKTtcbiAgICB9XG5cbiAgICBzdGFydCA9IChkdXJhdGlvbikgPT4ge1xuICAgICAgICBpZiAodGhpcy5ydW5uaW5nKSByZXR1cm47XG4gICAgICAgIGlmICh0eXBlb2YgZHVyYXRpb24gIT09IFwidW5kZWZpbmVkXCIpIHRoaXMuZHVyYXRpb24gPSBkdXJhdGlvbjtcblxuICAgICAgICB0aGlzLnJ1bm5pbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLnN0YXJ0VGltZSA9IERhdGUubm93KCk7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdmFyIGRpZmY7XG5cbiAgICAgICAgKGZ1bmN0aW9uIHRpbWVyKCkge1xuICAgICAgICAgICAgZGlmZiA9IHRoYXQuZHVyYXRpb24gLSAoRGF0ZS5ub3coKSAtIHRoYXQuc3RhcnRUaW1lKTtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwidGltZXIoKVwiLCB0aGF0LmR1cmF0aW9uLCB0aGF0LnN0YXJ0VGltZSwgZGlmZik7XG4gICAgICAgICAgICBpZiAoZGlmZiA8PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhhdC5mbGFnQ2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICB0aGF0LnBhdXNlKGZhbHNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGF0LnRpbWVvdXQgPSBzZXRUaW1lb3V0KHRpbWVyLCB0aGF0LmdyYW51bGFyaXR5KTtcbiAgICAgICAgICAgIHRoYXQudGlja0NhbGxiYWNrcy5mb3JFYWNoKGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2suY2FsbCh0aGF0LCB0aGF0LCBkaWZmKTtcbiAgICAgICAgICAgIH0sIHRoYXQpO1xuICAgICAgICB9KCkpO1xuICAgIH1cblxuICAgIG9uVGljayA9IChjYWxsYmFjaykgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0aGlzLnRpY2tDYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgb25GbGFnID0gKGNhbGxiYWNrKSA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHRoaXMucGF1c2UoZmFsc2UpO1xuICAgICAgICAgICAgdGhpcy5mbGFnQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBwYXVzZSA9ICh3aXRoSW5jcmVtZW50KSA9PiB7XG4gICAgICAgIGlmICghdGhpcy5ydW5uaW5nKSByZXR1cm47XG5cbiAgICAgICAgdGhpcy5ydW5uaW5nID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLnRpbWVvdXQpIGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXQpO1xuICAgICAgICB0aGlzLnRpbWVvdXQgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuZHVyYXRpb24gLT0gRGF0ZS5ub3coKSAtIHRoaXMuc3RhcnRUaW1lO1xuICAgICAgICBpZiAod2l0aEluY3JlbWVudCAmJiB0aGlzLmluY3JlbWVudCkgdGhpcy5kdXJhdGlvbiArPSB0aGlzLmluY3JlbWVudDtcbiAgICAgICAgcmVuZGVyVGltZSh0aGlzLCB0aGlzLmR1cmF0aW9uKTtcbiAgICB9XG5cbiAgICBzZXRUaW1lID0gKG1pbGxpcykgPT4ge1xuICAgICAgICB0aGlzLmR1cmF0aW9uID0gbWlsbGlzO1xuICAgICAgICByZW5kZXJUaW1lKHRoaXMsIHRoaXMuZHVyYXRpb24pO1xuICAgIH1cblxuICAgIHBhcnNlVGltZSA9IChtaWxsaXMpID0+IHtcbiAgICAgICAgbGV0IG1pbnV0ZXMgPSBNYXRoLmZsb29yKG1pbGxpcyAvIDYwMDAwKTtcbiAgICAgICAgbGV0IHNlY29uZHMgPSAobWlsbGlzICUgNjAwMDApIC8gMTAwMDtcbiAgICAgICAgbGV0IHNlY3MsIG1pbnM7XG4gICAgICAgIGlmIChNYXRoLmZsb29yKHNlY29uZHMpID09IDYwKSB7XG4gICAgICAgICAgICBtaW51dGVzKys7XG4gICAgICAgICAgICBzZWNvbmRzID0gMDtcbiAgICAgICAgfVxuICAgICAgICBtaW51dGVzID0gTWF0aC5tYXgoMCwgbWludXRlcyk7XG4gICAgICAgIHNlY29uZHMgPSBNYXRoLm1heCgwLCBzZWNvbmRzKTtcbiAgICAgICAgaWYgKG1pbGxpcyA8IDEwMDAwKSB7XG4gICAgICAgICAgICBzZWNzID0gc2Vjb25kcy50b0ZpeGVkKDEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VjcyA9IFN0cmluZyhNYXRoLmZsb29yKHNlY29uZHMpKTtcbiAgICAgICAgfVxuICAgICAgICBtaW5zID0gKG1pbnV0ZXMgPCAxMCA/IFwiMFwiIDogXCJcIikgKyBTdHJpbmcobWludXRlcyk7XG4gICAgICAgIHNlY3MgPSAoc2Vjb25kcyA8IDEwID8gXCIwXCIgOiBcIlwiKSArIHNlY3M7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBtaW51dGVzOiBtaW5zLFxuICAgICAgICAgICAgc2Vjb25kczogc2VjcyxcbiAgICAgICAgfTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJUaW1lKGNsb2NrLCB0aW1lKSB7XG4gICAgaWYgKGNsb2NrLmdyYW51bGFyaXR5ID4gMTAwICYmIHRpbWUgPCAxMDAwMCkgY2xvY2suZ3JhbnVsYXJpdHkgPSAxMDA7XG4gICAgY29uc3QgcGFyc2VkID0gY2xvY2sucGFyc2VUaW1lKHRpbWUpO1xuICAgIC8vIGNvbnNvbGUubG9nKFwicmVuZGVyVGltZSgpOlwiLCB0aW1lLCBwYXJzZWQpO1xuXG4gICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKHRpbWUpO1xuICAgIGNvbnN0IG1pbGxpcyA9IGRhdGUuZ2V0VVRDTWlsbGlzZWNvbmRzKCk7XG4gICAgY2xvY2suZWwgPSBwYXRjaChjbG9jay5lbCwgaCgnZGl2LmNsb2NrLXdyYXAjJyArIGNsb2NrLmlkLCBbXG4gICAgICAgIGgoJ2Rpdi5jbG9jaycsIFtcbiAgICAgICAgICAgIGgoJ2Rpdi5jbG9jay50aW1lLm1pbicsIHtjbGFzczoge3J1bm5pbmc6IGNsb2NrLnJ1bm5pbmcsIGh1cnJ5OiB0aW1lIDwgMTAwMDAsIGNvbm5lY3Rpbmc6IGNsb2NrLmNvbm5lY3Rpbmd9fSwgcGFyc2VkLm1pbnV0ZXMpLFxuICAgICAgICAgICAgaCgnZGl2LmNsb2NrLnNlcCcsIHtjbGFzczoge3J1bm5pbmc6IGNsb2NrLnJ1bm5pbmcsIGh1cnJ5OiB0aW1lIDwgMTAwMDAsIGxvdzogbWlsbGlzIDwgNTAwLCBjb25uZWN0aW5nOiBjbG9jay5jb25uZWN0aW5nfX0gLCAnOicpLFxuICAgICAgICAgICAgaCgnZGl2LmNsb2NrLnRpbWUuc2VjJywge2NsYXNzOiB7cnVubmluZzogY2xvY2sucnVubmluZywgaHVycnk6IHRpbWUgPCAxMDAwMCwgY29ubmVjdGluZzogY2xvY2suY29ubmVjdGluZ319LCBwYXJzZWQuc2Vjb25kcylcbiAgICAgICAgXSlcbiAgICBdKVxuICAgICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0aW1lYWdvKGRhdGUpIHtcbiAgICBjb25zdCBUWmRhdGUgPSBuZXcgRGF0ZShkYXRlICsgJ1onKTtcbiAgICB2YXIgdmFsID0gMCB8IChEYXRlLm5vdygpIC0gVFpkYXRlLmdldFRpbWUoKSkgLyAxMDAwO1xuICAgIHZhciB1bml0LCBsZW5ndGggPSB7IHNlY29uZDogNjAsIG1pbnV0ZTogNjAsIGhvdXI6IDI0LCBkYXk6IDcsIHdlZWs6IDQuMzUsXG4gICAgICAgIG1vbnRoOiAxMiwgeWVhcjogMTAwMDAgfSwgcmVzdWx0O1xuIFxuICAgIGZvciAodW5pdCBpbiBsZW5ndGgpIHtcbiAgICAgICAgcmVzdWx0ID0gdmFsICUgbGVuZ3RoW3VuaXRdO1xuICAgICAgICBpZiAoISh2YWwgPSAwIHwgdmFsIC8gbGVuZ3RoW3VuaXRdKSlcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQgKyAnICcgKyAocmVzdWx0LTEgPyB1bml0ICsgJ3MnIDogdW5pdCkgKyAnIGFnbyc7XG4gICAgfVxuICAgIHJldHVybiAnJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlclRpbWVhZ28oKSB7XG4gICAgdmFyIHggPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImluZm8tZGF0ZVwiKTtcbiAgICB2YXIgaTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgeC5sZW5ndGg7IGkrKykge1xuICAgICAgICB4W2ldLmlubmVySFRNTCA9IHRpbWVhZ28oeFtpXS5nZXRBdHRyaWJ1dGUoJ3RpbWVzdGFtcCcpKTtcbiAgICB9XG4gICAgc2V0VGltZW91dChyZW5kZXJUaW1lYWdvLCAxMjAwKTtcbn0iLCJpbXBvcnQgeyBoLCBpbml0IH0gZnJvbSBcInNuYWJiZG9tXCI7XHJcbmltcG9ydCBrbGFzcyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL2NsYXNzJztcclxuaW1wb3J0IGF0dHJpYnV0ZXMgZnJvbSAnc25hYmJkb20vbW9kdWxlcy9hdHRyaWJ1dGVzJztcclxuaW1wb3J0IGxpc3RlbmVycyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL2V2ZW50bGlzdGVuZXJzJztcclxuaW1wb3J0IHRvVk5vZGUgZnJvbSAnc25hYmJkb20vdG92bm9kZSc7XHJcblxyXG5pbXBvcnQgeyBrZXkycG9zIH0gZnJvbSAnY2hlc3Nncm91bmR4L3V0aWwnO1xyXG5cclxuaW1wb3J0IHsgY2FuR2F0ZSwgcm9sZVRvU2FuIH0gZnJvbSAnLi9jaGVzcyc7XHJcbmltcG9ydCB7IHBvY2tldFZpZXcgfSBmcm9tICcuL3BvY2tldCc7XHJcblxyXG5jb25zdCBwYXRjaCA9IGluaXQoW2tsYXNzLCBhdHRyaWJ1dGVzLCBsaXN0ZW5lcnNdKTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGN0cmwpIHtcclxuXHJcbiAgICBsZXQgZ2F0aW5nOiBhbnkgPSBmYWxzZTtcclxuICAgIGxldCByb2xlczogc3RyaW5nW10gPSBbXTtcclxuXHJcbiAgICBmdW5jdGlvbiBzdGFydChmZW4sIG9yaWcsIGRlc3QsIG1ldGEpIHtcclxuICAgICAgICBjb25zdCBncm91bmQgPSBjdHJsLmdldEdyb3VuZCgpO1xyXG4gICAgICAgIGNvbnN0IGdhdGFibGUgPSBjYW5HYXRlKGZlbiwgZ3JvdW5kLnN0YXRlLnBpZWNlc1tkZXN0XSwgb3JpZywgZGVzdCwgbWV0YSlcclxuICAgICAgICByb2xlcyA9IFtcImhhd2tcIiwgXCJlbGVwaGFudFwiLCBcInF1ZWVuXCIsIFwicm9va1wiLCBcImJpc2hvcFwiLCBcImtuaWdodFwiLCBcIlwiXTtcclxuXHJcbiAgICAgICAgaWYgKGdhdGFibGVbMF0gfHwgZ2F0YWJsZVsxXSB8fCBnYXRhYmxlWzJdIHx8IGdhdGFibGVbM10gfHwgZ2F0YWJsZVs0XSB8fCBnYXRhYmxlWzVdKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbG9yID0gY3RybC5teWNvbG9yO1xyXG4gICAgICAgICAgICBjb25zdCBvcmllbnRhdGlvbiA9IGdyb3VuZC5zdGF0ZS5vcmllbnRhdGlvbjtcclxuICAgICAgICAgICAgaWYgKHJvbGVzLmluZGV4T2YoXCJoYXdrXCIpICE9PSAtMSAmJiAhZ2F0YWJsZVswXSkgcm9sZXMuc3BsaWNlKHJvbGVzLmluZGV4T2YoXCJoYXdrXCIpLCAxKTtcclxuICAgICAgICAgICAgaWYgKHJvbGVzLmluZGV4T2YoXCJlbGVwaGFudFwiKSAhPT0gLTEgJiYgIWdhdGFibGVbMV0pIHJvbGVzLnNwbGljZShyb2xlcy5pbmRleE9mKFwiZWxlcGhhbnRcIiksIDEpO1xyXG4gICAgICAgICAgICBpZiAocm9sZXMuaW5kZXhPZihcInF1ZWVuXCIpICE9PSAtMSAmJiAhZ2F0YWJsZVsyXSkgcm9sZXMuc3BsaWNlKHJvbGVzLmluZGV4T2YoXCJxdWVlblwiKSwgMSk7XHJcbiAgICAgICAgICAgIGlmIChyb2xlcy5pbmRleE9mKFwicm9va1wiKSAhPT0gLTEgJiYgIWdhdGFibGVbM10pIHJvbGVzLnNwbGljZShyb2xlcy5pbmRleE9mKFwicm9va1wiKSwgMSk7XHJcbiAgICAgICAgICAgIGlmIChyb2xlcy5pbmRleE9mKFwiYmlzaG9wXCIpICE9PSAtMSAmJiAhZ2F0YWJsZVs0XSkgcm9sZXMuc3BsaWNlKHJvbGVzLmluZGV4T2YoXCJiaXNob3BcIiksIDEpO1xyXG4gICAgICAgICAgICBpZiAocm9sZXMuaW5kZXhPZihcImtuaWdodFwiKSAhPT0gLTEgJiYgIWdhdGFibGVbNV0pIHJvbGVzLnNwbGljZShyb2xlcy5pbmRleE9mKFwia25pZ2h0XCIpLCAxKTtcclxuXHJcbiAgICAgICAgICAgIHZhciBvcmlncyA9IFtvcmlnXTtcclxuICAgICAgICAgICAgY29uc3QgY2FzdGxpbmcgPSBncm91bmQuc3RhdGUucGllY2VzW2Rlc3RdLnJvbGUgPT09IFwia2luZ1wiICYmIG9yaWdbMF0gPT09IFwiZVwiICYmIGRlc3RbMF0gIT09IFwiZFwiICYmIGRlc3RbMF0gIT09IFwiZVwiICYmIGRlc3RbMF0gIT09IFwiZlwiO1xyXG4gICAgICAgICAgICB2YXIgcm9va0Rlc3QgPSBcIlwiO1xyXG4gICAgICAgICAgICBpZiAoY2FzdGxpbmcpIHtcclxuICAgICAgICAgICAgICAgIC8vIE8tT1xyXG4gICAgICAgICAgICAgICAgaWYgKGRlc3RbMF0gPiBcImVcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIG9yaWdzLnB1c2goXCJoXCIgKyBvcmlnWzFdKTtcclxuICAgICAgICAgICAgICAgICAgICByb29rRGVzdCA9ICBcImVcIiArIG9yaWdbMV07XHJcbiAgICAgICAgICAgICAgICAvLyBPLU8tT1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBvcmlncy5wdXNoKFwiYVwiICsgb3JpZ1sxXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcm9va0Rlc3QgPSAgXCJlXCIgKyBvcmlnWzFdO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgZHJhd19nYXRpbmcob3JpZ3MsIGNvbG9yLCBvcmllbnRhdGlvbik7XHJcbiAgICAgICAgICAgIGdhdGluZyA9IHtcclxuICAgICAgICAgICAgICAgIG9yaWdzOiBvcmlncyxcclxuICAgICAgICAgICAgICAgIGRlc3Q6IGRlc3QsXHJcbiAgICAgICAgICAgICAgICByb29rRGVzdDogcm9va0Rlc3QsXHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogY3RybC5zZW5kTW92ZSxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH07XHJcblxyXG4gICAgZnVuY3Rpb24gZ2F0ZShjdHJsLCBvcmlnLCBkZXN0LCByb2xlKSB7XHJcbiAgICAgICAgY29uc3QgZyA9IGN0cmwuZ2V0R3JvdW5kKCk7XHJcbiAgICAgICAgY29uc3QgY29sb3IgPSBnLnN0YXRlLnBpZWNlc1tkZXN0XS5jb2xvcjtcclxuICAgICAgICBnLm5ld1BpZWNlKHtcInJvbGVcIjogcm9sZSwgXCJjb2xvclwiOiBjb2xvcn0sIG9yaWcpXHJcbiAgICAgICAgY3RybC5wb2NrZXRzW2NvbG9yID09PSAnd2hpdGUnID8gMCA6IDFdW3JvbGVdLS07XHJcbiAgICAgICAgY3RybC52cG9ja2V0MSA9IHBhdGNoKGN0cmwudnBvY2tldDEsIHBvY2tldFZpZXcoY3RybCwgY29sb3IsIFwiYm90dG9tXCIpKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkcmF3X2dhdGluZyhvcmlncywgY29sb3IsIG9yaWVudGF0aW9uKSB7XHJcbiAgICAgICAgdmFyIGNvbnRhaW5lciA9IHRvVk5vZGUoZG9jdW1lbnQucXVlcnlTZWxlY3RvcignZXh0ZW5zaW9uJykgYXMgTm9kZSk7XHJcbiAgICAgICAgcGF0Y2goY29udGFpbmVyLCByZW5kZXJHYXRpbmcob3JpZ3MsIGNvbG9yLCBvcmllbnRhdGlvbikpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRyYXdfbm9fZ2F0aW5nKCkge1xyXG4gICAgICAgIHZhciBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZXh0ZW5zaW9uX2Nob2ljZScpIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgIHBhdGNoKGNvbnRhaW5lciwgaCgnZXh0ZW5zaW9uJykpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZpbmlzaChyb2xlLCBpbmRleCkge1xyXG4gICAgICAgIGlmIChnYXRpbmcpIHtcclxuICAgICAgICAgICAgZHJhd19ub19nYXRpbmcoKTtcclxuICAgICAgICAgICAgaWYgKHJvbGUpIGdhdGUoY3RybCwgZ2F0aW5nLm9yaWdzW2luZGV4XSwgZ2F0aW5nLmRlc3QsIHJvbGUpO1xyXG4gICAgICAgICAgICBlbHNlIGluZGV4ID0gMDtcclxuICAgICAgICAgICAgY29uc3QgZ2F0ZWQgPSByb2xlID8gcm9sZVRvU2FuW3JvbGVdLnRvTG93ZXJDYXNlKCkgOiBcIlwiO1xyXG4gICAgICAgICAgICBpZiAoZ2F0aW5nLmNhbGxiYWNrKSBnYXRpbmcuY2FsbGJhY2soZ2F0aW5nLm9yaWdzW2luZGV4XSwgaW5kZXggPT09IDAgPyBnYXRpbmcuZGVzdCA6IGdhdGluZy5yb29rRGVzdCwgZ2F0ZWQpO1xyXG4gICAgICAgICAgICBnYXRpbmcgPSBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIGZ1bmN0aW9uIGNhbmNlbCgpIHtcclxuICAgICAgICBkcmF3X25vX2dhdGluZygpO1xyXG4gICAgICAgIGN0cmwuZ29QbHkoY3RybC5wbHkpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBiaW5kKGV2ZW50TmFtZTogc3RyaW5nLCBmOiAoZTogRXZlbnQpID0+IHZvaWQsIHJlZHJhdykge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGluc2VydCh2bm9kZSkge1xyXG4gICAgICAgICAgICAgICAgdm5vZGUuZWxtLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBlID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXMgPSBmKGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWRyYXcpIHJlZHJhdygpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXM7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcmVuZGVyU3F1YXJlcyhvcmlnLCBjb2xvciwgb3JpZW50YXRpb24sIGluZGV4KSB7XHJcbiAgICAgICAgY29uc3QgZmlyc3RSYW5rSXMwID0gZmFsc2U7XHJcbiAgICAgICAgdmFyIGxlZnQgPSAoOCAtIGtleTJwb3Mob3JpZywgZmlyc3RSYW5rSXMwKVswXSkgKiAxMi41O1xyXG4gICAgICAgIGlmIChvcmllbnRhdGlvbiA9PT0gXCJ3aGl0ZVwiKSBsZWZ0ID0gODcuNSAtIGxlZnQ7XHJcbiAgICAgICAgcmV0dXJuIHJvbGVzLm1hcCgoc2VydmVyUm9sZSwgaSkgPT4ge1xyXG4gICAgICAgICAgICB2YXIgdG9wID0gKGNvbG9yID09PSBvcmllbnRhdGlvbiA/IDcgLSBpIDogaSkgKiAxMi41O1xyXG4gICAgICAgICAgICByZXR1cm4gaChcclxuICAgICAgICAgICAgICAgIFwic3F1YXJlXCIsXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXR0cnM6IHsgc3R5bGU6IFwidG9wOiBcIiArIHRvcCArIFwiJTtsZWZ0OiBcIiArIGxlZnQgKyBcIiVcIiB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGhvb2s6IGJpbmQoXCJjbGlja1wiLCBlID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmluaXNoKHNlcnZlclJvbGUsIGluZGV4KTtcclxuICAgICAgICAgICAgICAgICAgICB9LCBmYWxzZSlcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBbaChcInBpZWNlLlwiICsgc2VydmVyUm9sZSArIFwiLlwiICsgY29sb3IpXVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcmVuZGVyR2F0aW5nKG9yaWdzLCBjb2xvciwgb3JpZW50YXRpb24pIHtcclxuICAgICAgICB2YXIgdmVydGljYWwgPSBjb2xvciA9PT0gb3JpZW50YXRpb24gPyBcInRvcFwiIDogXCJib3R0b21cIjtcclxuICAgICAgICB2YXIgc3F1YXJlcyA9IHJlbmRlclNxdWFyZXMob3JpZ3NbMF0sIGNvbG9yLCBvcmllbnRhdGlvbiwgMCk7XHJcbiAgICAgICAgaWYgKG9yaWdzLmxlbmd0aCA+IDEpIHNxdWFyZXMgPSBzcXVhcmVzLmNvbmNhdChyZW5kZXJTcXVhcmVzKG9yaWdzWzFdLCBjb2xvciwgb3JpZW50YXRpb24sIDEpKTtcclxuICAgICAgICByZXR1cm4gaChcclxuICAgICAgICAgICAgXCJkaXYjZXh0ZW5zaW9uX2Nob2ljZS5cIiArIHZlcnRpY2FsLFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBob29rOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0OiB2bm9kZSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVsID0gdm5vZGUuZWxtIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gY2FuY2VsKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbC5hZGRFdmVudExpc3RlbmVyKFwiY29udGV4dG1lbnVcIiwgZSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc3F1YXJlc1xyXG4gICAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBzdGFydCxcclxuICAgIH07XHJcbn1cclxuIiwiaW1wb3J0IFNvY2tldHRlIGZyb20gJ3NvY2tldHRlJztcclxuXHJcbmltcG9ydCB7IGluaXQgfSBmcm9tICdzbmFiYmRvbSc7XHJcbmltcG9ydCBrbGFzcyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL2NsYXNzJztcclxuaW1wb3J0IGF0dHJpYnV0ZXMgZnJvbSAnc25hYmJkb20vbW9kdWxlcy9hdHRyaWJ1dGVzJztcclxuaW1wb3J0IHByb3BlcnRpZXMgZnJvbSAnc25hYmJkb20vbW9kdWxlcy9wcm9wcyc7XHJcbmltcG9ydCBsaXN0ZW5lcnMgZnJvbSAnc25hYmJkb20vbW9kdWxlcy9ldmVudGxpc3RlbmVycyc7XHJcblxyXG5jb25zdCBwYXRjaCA9IGluaXQoW2tsYXNzLCBhdHRyaWJ1dGVzLCBwcm9wZXJ0aWVzLCBsaXN0ZW5lcnNdKTtcclxuXHJcbmltcG9ydCBoIGZyb20gJ3NuYWJiZG9tL2gnO1xyXG5pbXBvcnQgeyBWTm9kZSB9IGZyb20gJ3NuYWJiZG9tL3Zub2RlJztcclxuXHJcbmltcG9ydCB7IHJlbmRlclVzZXJuYW1lIH0gZnJvbSAnLi91c2VyJztcclxuaW1wb3J0IHsgY2hhdE1lc3NhZ2UsIGNoYXRWaWV3IH0gZnJvbSAnLi9jaGF0JztcclxuaW1wb3J0IHsgdmFyaWFudHMsIHZhcmlhbnRzOTYwLCBWQVJJQU5UUyB9IGZyb20gJy4vY2hlc3MnO1xyXG5pbXBvcnQgeyBzb3VuZCB9IGZyb20gJy4vc291bmQnO1xyXG5cclxuXHJcbmNsYXNzIExvYmJ5Q29udHJvbGxlciB7XHJcbiAgICBtb2RlbDtcclxuICAgIHNvY2s7XHJcbiAgICBwbGF5ZXI7XHJcbiAgICBsb2dnZWRfaW47XHJcbiAgICBjaGFsbGVuZ2VBSTtcclxuICAgIF93cztcclxuICAgIHNlZWtzO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGVsLCBtb2RlbCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiTG9iYnlDb250cm9sbGVyIGNvbnN0cnVjdG9yXCIsIGVsLCBtb2RlbCk7XHJcblxyXG4gICAgICAgIHRoaXMubW9kZWwgPSBtb2RlbDtcclxuICAgICAgICB0aGlzLmNoYWxsZW5nZUFJID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGNvbnN0IG9uT3BlbiA9IChldnQpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5fd3MgPSBldnQudGFyZ2V0O1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIi0tLUNPTk5FQ1RFRFwiLCBldnQpO1xyXG4gICAgICAgICAgICB0aGlzLmRvU2VuZCh7IHR5cGU6IFwibG9iYnlfdXNlcl9jb25uZWN0ZWRcIiwgdXNlcm5hbWU6IHRoaXMubW9kZWxbXCJ1c2VybmFtZVwiXX0pO1xyXG4gICAgICAgICAgICB0aGlzLmRvU2VuZCh7IHR5cGU6IFwiZ2V0X3NlZWtzXCIgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLl93cyA9IHtcInJlYWR5U3RhdGVcIjogLTF9O1xyXG4gICAgICAgIGNvbnN0IG9wdHMgPSB7XHJcbiAgICAgICAgICAgIG1heEF0dGVtcHRzOiAyMCxcclxuICAgICAgICAgICAgb25vcGVuOiBlID0+IG9uT3BlbihlKSxcclxuICAgICAgICAgICAgb25tZXNzYWdlOiBlID0+IHRoaXMub25NZXNzYWdlKGUpLFxyXG4gICAgICAgICAgICBvbnJlY29ubmVjdDogZSA9PiBjb25zb2xlLmxvZygnUmVjb25uZWN0aW5nIGluIGxvYmJ5Li4uJywgZSksXHJcbiAgICAgICAgICAgIG9ubWF4aW11bTogZSA9PiBjb25zb2xlLmxvZygnU3RvcCBBdHRlbXB0aW5nIScsIGUpLFxyXG4gICAgICAgICAgICBvbmNsb3NlOiBlID0+IHtjb25zb2xlLmxvZygnQ2xvc2VkIScsIGUpO30sXHJcbiAgICAgICAgICAgIG9uZXJyb3I6IGUgPT4gY29uc29sZS5sb2coJ0Vycm9yOicsIGUpLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHRoaXMuc29jayA9IG5ldyBTb2NrZXR0ZShcIndzOi8vXCIgKyBsb2NhdGlvbi5ob3N0ICsgXCIvd3NsXCIsIG9wdHMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRjaChlcnIpIHtcclxuICAgICAgICAgICAgdGhpcy5zb2NrID0gbmV3IFNvY2tldHRlKFwid3NzOi8vXCIgKyBsb2NhdGlvbi5ob3N0ICsgXCIvd3NsXCIsIG9wdHMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gZ2V0IHNlZWtzIHdoZW4gd2UgYXJlIGNvbWluZyBiYWNrIGFmdGVyIGEgZ2FtZVxyXG4gICAgICAgIGlmICh0aGlzLl93cy5yZWFkeVN0YXRlID09PSAxKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZG9TZW5kKHsgdHlwZTogXCJnZXRfc2Vla3NcIiB9KTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHBhdGNoKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzZWVrYnV0dG9ucycpIGFzIEhUTUxFbGVtZW50LCBoKCd1bCNzZWVrYnV0dG9ucycsIHRoaXMucmVuZGVyU2Vla0J1dHRvbnMoKSkpO1xyXG4gICAgICAgIHBhdGNoKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsb2JieWNoYXQnKSBhcyBIVE1MRWxlbWVudCwgY2hhdFZpZXcodGhpcywgXCJsb2JieWNoYXRcIikpO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBkb1NlbmQgKG1lc3NhZ2UpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIi0tLT4gbG9iYnkgZG9TZW5kKCk6XCIsIG1lc3NhZ2UpO1xyXG4gICAgICAgIHRoaXMuc29jay5zZW5kKEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UpKTtcclxuICAgIH1cclxuXHJcbiAgICBjcmVhdGVTZWVrTXNnICh2YXJpYW50LCBjb2xvciwgZmVuLCBtaW51dGVzLCBpbmNyZW1lbnQsIGNoZXNzOTYwKSB7XHJcbiAgICAgICAgdGhpcy5kb1NlbmQoe1xyXG4gICAgICAgICAgICB0eXBlOiBcImNyZWF0ZV9zZWVrXCIsXHJcbiAgICAgICAgICAgIHVzZXI6IHRoaXMubW9kZWxbXCJ1c2VybmFtZVwiXSxcclxuICAgICAgICAgICAgdmFyaWFudDogdmFyaWFudCxcclxuICAgICAgICAgICAgZmVuOiBmZW4sXHJcbiAgICAgICAgICAgIG1pbnV0ZXM6IG1pbnV0ZXMsXHJcbiAgICAgICAgICAgIGluY3JlbWVudDogaW5jcmVtZW50LFxyXG4gICAgICAgICAgICByYXRlZDogZmFsc2UsXHJcbiAgICAgICAgICAgIGNoZXNzOTYwOiBjaGVzczk2MCxcclxuICAgICAgICAgICAgY29sb3I6IGNvbG9yIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGNyZWF0ZUJvdENoYWxsZW5nZU1zZyAodmFyaWFudCwgY29sb3IsIGZlbiwgbWludXRlcywgaW5jcmVtZW50LCBsZXZlbCwgY2hlc3M5NjApIHtcclxuICAgICAgICB0aGlzLmRvU2VuZCh7XHJcbiAgICAgICAgICAgIHR5cGU6IFwiY3JlYXRlX2FpX2NoYWxsZW5nZVwiLFxyXG4gICAgICAgICAgICB1c2VyOiB0aGlzLm1vZGVsW1widXNlcm5hbWVcIl0sXHJcbiAgICAgICAgICAgIHZhcmlhbnQ6IHZhcmlhbnQsXHJcbiAgICAgICAgICAgIGZlbjogZmVuLFxyXG4gICAgICAgICAgICBtaW51dGVzOiBtaW51dGVzLFxyXG4gICAgICAgICAgICBpbmNyZW1lbnQ6IGluY3JlbWVudCxcclxuICAgICAgICAgICAgcmF0ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICBsZXZlbDogbGV2ZWwsXHJcbiAgICAgICAgICAgIGNoZXNzOTYwOiBjaGVzczk2MCxcclxuICAgICAgICAgICAgY29sb3I6IGNvbG9yIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGlzTmV3U2VlayAodmFyaWFudCwgY29sb3IsIGZlbiwgbWludXRlcywgaW5jcmVtZW50KSB7XHJcbiAgICAgICAgcmV0dXJuICF0aGlzLnNlZWtzLnNvbWUoc2VlayA9PiB7XHJcbiAgICAgICAgICAgIHJldHVybiBzZWVrLnVzZXIgPT09IHRoaXMubW9kZWxbXCJ1c2VybmFtZVwiXSAmJiBzZWVrLnZhcmlhbnQgPT09IHZhcmlhbnQgJiYgc2Vlay5mZW4gPT09IGZlbiAmJiBzZWVrLmNvbG9yID09PSBjb2xvciAmJiBzZWVrLnRjID09PSBtaW51dGVzICsgXCIrXCIgKyBpbmNyZW1lbnQ7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBjcmVhdGVTZWVrIChjb2xvcikge1xyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpZDAxJykhLnN0eWxlLmRpc3BsYXk9J25vbmUnO1xyXG4gICAgICAgIGxldCBlO1xyXG4gICAgICAgIGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndmFyaWFudCcpIGFzIEhUTUxTZWxlY3RFbGVtZW50O1xyXG4gICAgICAgIGNvbnN0IHZhcmlhbnQgPSBlLm9wdGlvbnNbZS5zZWxlY3RlZEluZGV4XS52YWx1ZTtcclxuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInNlZWtfdmFyaWFudFwiLCB2YXJpYW50KTtcclxuXHJcbiAgICAgICAgZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmZW4nKSBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG4gICAgICAgIGNvbnN0IGZlbiA9IGUudmFsdWU7XHJcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJzZWVrX2ZlblwiLCBlLnZhbHVlKTtcclxuXHJcbiAgICAgICAgZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtaW4nKSBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG4gICAgICAgIGNvbnN0IG1pbnV0ZXMgPSBwYXJzZUludChlLnZhbHVlKTtcclxuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInNlZWtfbWluXCIsIGUudmFsdWUpO1xyXG5cclxuICAgICAgICBlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2luYycpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcbiAgICAgICAgY29uc3QgaW5jcmVtZW50ID0gcGFyc2VJbnQoZS52YWx1ZSk7XHJcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJzZWVrX2luY1wiLCBlLnZhbHVlKTtcclxuXHJcbiAgICAgICAgZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGVzczk2MCcpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcbiAgICAgICAgY29uc3QgaGlkZSA9IHZhcmlhbnRzOTYwLmluZGV4T2YodmFyaWFudCkgPT09IC0xO1xyXG4gICAgICAgIGNvbnN0IGNoZXNzOTYwID0gKGhpZGUpID8gZmFsc2UgOiBlLmNoZWNrZWQ7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJDUkVBVEUgU0VFSyB2YXJpYW50LCBjb2xvciwgZmVuLCBtaW51dGVzLCBpbmNyZW1lbnQsIGhpZGUsIGNoZXNzOTYwXCIsIHZhcmlhbnQsIGNvbG9yLCBmZW4sIG1pbnV0ZXMsIGluY3JlbWVudCwgaGlkZSwgY2hlc3M5NjApO1xyXG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwic2Vla19jaGVzczk2MFwiLCBlLmNoZWNrZWQpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5jaGFsbGVuZ2VBSSkge1xyXG4gICAgICAgICAgICBlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignaW5wdXRbbmFtZT1cImxldmVsXCJdOmNoZWNrZWQnKSBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG4gICAgICAgICAgICBjb25zdCBsZXZlbCA9IHBhcnNlSW50KGUudmFsdWUpO1xyXG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInNlZWtfbGV2ZWxcIiwgZS52YWx1ZSk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGxldmVsLCBlLnZhbHVlLCBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcInNlZWtfbGV2ZWxcIikpO1xyXG4gICAgICAgICAgICB0aGlzLmNyZWF0ZUJvdENoYWxsZW5nZU1zZyh2YXJpYW50LCBjb2xvciwgZmVuLCBtaW51dGVzLCBpbmNyZW1lbnQsIGxldmVsLCBjaGVzczk2MCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNOZXdTZWVrKHZhcmlhbnQsIGNvbG9yLCBmZW4sIG1pbnV0ZXMsIGluY3JlbWVudCkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3JlYXRlU2Vla01zZyh2YXJpYW50LCBjb2xvciwgZmVuLCBtaW51dGVzLCBpbmNyZW1lbnQsIGNoZXNzOTYwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZW5kZXJTZWVrQnV0dG9ucyAoKSB7XHJcbiAgICAgICAgY29uc3Qgc2V0VmFyaWFudCA9ICgpID0+IHtcclxuICAgICAgICAgICAgbGV0IGU7XHJcbiAgICAgICAgICAgIGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndmFyaWFudCcpIGFzIEhUTUxTZWxlY3RFbGVtZW50O1xyXG4gICAgICAgICAgICBjb25zdCB2YXJpYW50ID0gZS5vcHRpb25zW2Uuc2VsZWN0ZWRJbmRleF0udmFsdWU7XHJcbiAgICAgICAgICAgIGNvbnN0IGhpZGUgPSB2YXJpYW50czk2MC5pbmRleE9mKHZhcmlhbnQpID09PSAtMTtcclxuXHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGVzczk2MC1ibG9jaycpIS5zdHlsZS5kaXNwbGF5ID0gKGhpZGUpID8gJ25vbmUnIDogJ2Jsb2NrJztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHNldE1pbnV0ZXMgPSAobWludXRlcykgPT4ge1xyXG4gICAgICAgICAgICB2YXIgbWluLCBpbmMgPSAwO1xyXG4gICAgICAgICAgICB2YXIgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1pbnV0ZXNcIikgYXMgSFRNTEVsZW1lbnQ7XHJcbiAgICAgICAgICAgIGlmIChlbCkgZWwuaW5uZXJIVE1MID0gbWludXRlcztcclxuXHJcbiAgICAgICAgICAgIHZhciBlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21pbicpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcbiAgICAgICAgICAgIGlmIChlKSBtaW4gPSBwYXJzZUludChlLnZhbHVlKTtcclxuXHJcbiAgICAgICAgICAgIGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaW5jJykgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgICAgICAgICAgaWYgKGUpIGluYyA9IHBhcnNlSW50KGUudmFsdWUpO1xyXG5cclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbG9yLWJ1dHRvbi1ncm91cCcpIS5zdHlsZS5kaXNwbGF5ID0gKG1pbiArIGluYyA9PT0gMCkgPyAnbm9uZScgOiAnYmxvY2snO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgc2V0SW5jcmVtZW50ID0gKGluY3JlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICB2YXIgbWluLCBpbmMgPSAwO1xyXG4gICAgICAgICAgICB2YXIgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImluY3JlbWVudFwiKSBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICAgICAgaWYgKGVsKSBlbC5pbm5lckhUTUwgPSBpbmNyZW1lbnQ7XHJcblxyXG4gICAgICAgICAgICB2YXIgZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtaW4nKSBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG4gICAgICAgICAgICBpZiAoZSkgbWluID0gcGFyc2VJbnQoZS52YWx1ZSk7XHJcblxyXG4gICAgICAgICAgICBlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2luYycpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcbiAgICAgICAgICAgIGlmIChlKSBpbmMgPSBwYXJzZUludChlLnZhbHVlKTtcclxuXHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb2xvci1idXR0b24tZ3JvdXAnKSEuc3R5bGUuZGlzcGxheSA9IChtaW4gKyBpbmMgPT09IDApID8gJ25vbmUnIDogJ2Jsb2NrJztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHZJZHggPSBsb2NhbFN0b3JhZ2Uuc2Vla192YXJpYW50ID09PSB1bmRlZmluZWQgPyAwIDogdmFyaWFudHMuaW5kZXhPZihsb2NhbFN0b3JhZ2Uuc2Vla192YXJpYW50KTtcclxuICAgICAgICBjb25zdCB2RmVuID0gbG9jYWxTdG9yYWdlLnNlZWtfZmVuID09PSB1bmRlZmluZWQgPyBcIlwiIDogbG9jYWxTdG9yYWdlLnNlZWtfZmVuO1xyXG4gICAgICAgIGNvbnN0IHZNaW4gPSBsb2NhbFN0b3JhZ2Uuc2Vla19taW4gPT09IHVuZGVmaW5lZCA/IFwiNVwiIDogbG9jYWxTdG9yYWdlLnNlZWtfbWluO1xyXG4gICAgICAgIGNvbnN0IHZJbmMgPSBsb2NhbFN0b3JhZ2Uuc2Vla19pbmMgPT09IHVuZGVmaW5lZCA/IFwiM1wiIDogbG9jYWxTdG9yYWdlLnNlZWtfaW5jO1xyXG4gICAgICAgIGNvbnN0IHZMZXZlbCA9IGxvY2FsU3RvcmFnZS5zZWVrX2xldmVsID09PSB1bmRlZmluZWQgPyBcIjFcIiA6IGxvY2FsU3RvcmFnZS5zZWVrX2xldmVsO1xyXG4gICAgICAgIGNvbnN0IHZDaGVzczk2MCA9IGxvY2FsU3RvcmFnZS5zZWVrX2NoZXNzOTYwID09PSB1bmRlZmluZWQgPyBcImZhbHNlXCIgOiBsb2NhbFN0b3JhZ2Uuc2Vla19jaGVzczk2MDtcclxuICAgICAgICBjb25zb2xlLmxvZyhcImxvY2FsZVN0b3JhZ2Uuc2Vla19sZXZlbCwgdkxldmVsPVwiLCBsb2NhbFN0b3JhZ2Uuc2Vla19sZXZlbCwgdkxldmVsKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICBoKCdkaXYjaWQwMScsIHsgY2xhc3M6IHtcIm1vZGFsXCI6IHRydWV9IH0sIFtcclxuICAgICAgICAgIGgoJ2Zvcm0ubW9kYWwtY29udGVudCcsIFtcclxuICAgICAgICAgICAgaCgnZGl2I2Nsb3NlY29udGFpbmVyJywgW1xyXG4gICAgICAgICAgICAgIGgoJ3NwYW4uY2xvc2UnLCB7IG9uOiB7IGNsaWNrOiAoKSA9PiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaWQwMScpIS5zdHlsZS5kaXNwbGF5PSdub25lJyB9LCBhdHRyczogeydkYXRhLWljb24nOiAnaid9LCBwcm9wczoge3RpdGxlOiBcIkNhbmNlbFwifSB9KSxcclxuICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgIGgoJ2Rpdi5jb250YWluZXInLCBbXHJcbiAgICAgICAgICAgICAgICBoKCdsYWJlbCcsIHsgYXR0cnM6IHtmb3I6IFwidmFyaWFudFwifSB9LCBcIlZhcmlhbnRcIiksXHJcbiAgICAgICAgICAgICAgICBoKCdzZWxlY3QjdmFyaWFudCcsIHtcclxuICAgICAgICAgICAgICAgICAgICBwcm9wczoge25hbWU6IFwidmFyaWFudFwifSxcclxuICAgICAgICAgICAgICAgICAgICBvbjogeyBpbnB1dDogKCkgPT4gc2V0VmFyaWFudCgpIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgaG9vazoge2luc2VydDogKCkgPT4gc2V0VmFyaWFudCgpIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSwgdmFyaWFudHMubWFwKCh2YXJpYW50LCBpZHgpID0+IGgoJ29wdGlvbicsIHsgcHJvcHM6IHt2YWx1ZTogdmFyaWFudCwgc2VsZWN0ZWQ6IChpZHggPT09IHZJZHgpID8gXCJzZWxlY3RlZFwiIDogXCJcIn0gfSwgdmFyaWFudCkpKSxcclxuICAgICAgICAgICAgICAgIGgoJ2xhYmVsJywgeyBhdHRyczoge2ZvcjogXCJmZW5cIn0gfSwgXCJTdGFydCBwb3NpdGlvblwiKSxcclxuICAgICAgICAgICAgICAgIGgoJ2lucHV0I2ZlbicsIHsgcHJvcHM6IHtuYW1lOiAnZmVuJywgcGxhY2Vob2xkZXI6ICdQYXN0ZSB0aGUgRkVOIHRleHQgaGVyZScsIHZhbHVlOiB2RmVufSB9KSxcclxuICAgICAgICAgICAgICAgIGgoJ2RpdiNjaGVzczk2MC1ibG9jaycsIFtcclxuICAgICAgICAgICAgICAgICAgICBoKCdsYWJlbCcsIHsgYXR0cnM6IHtmb3I6IFwiY2hlc3M5NjBcIn0gfSwgXCJDaGVzczk2MFwiKSxcclxuICAgICAgICAgICAgICAgICAgICBoKCdpbnB1dCNjaGVzczk2MCcsIHtwcm9wczoge25hbWU6IFwiY2hlc3M5NjBcIiwgdHlwZTogXCJjaGVja2JveFwiLCBjaGVja2VkOiB2Q2hlc3M5NjAgPT09IFwidHJ1ZVwiID8gXCJjaGVja2VkXCIgOiBcIlwifX0pLFxyXG4gICAgICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgICAgICAvL2goJ2xhYmVsJywgeyBhdHRyczoge2ZvcjogXCJ0Y1wifSB9LCBcIlRpbWUgQ29udHJvbFwiKSxcclxuICAgICAgICAgICAgICAgIC8vaCgnc2VsZWN0I3RpbWVjb250cm9sJywgeyBwcm9wczoge25hbWU6IFwidGltZWNvbnRyb2xcIn0gfSwgW1xyXG4gICAgICAgICAgICAgICAgLy8gICAgaCgnb3B0aW9uJywgeyBwcm9wczoge3ZhbHVlOiBcIjFcIiwgc2VsZWN0ZWQ6IHRydWV9IH0sIFwiUmVhbCB0aW1lXCIpLFxyXG4gICAgICAgICAgICAgICAgLy8gICAgaCgnb3B0aW9uJywgeyBwcm9wczoge3ZhbHVlOiBcIjJcIn0gfSwgXCJVbmxpbWl0ZWRcIiksXHJcbiAgICAgICAgICAgICAgICAvL10pLFxyXG4gICAgICAgICAgICAgICAgaCgnbGFiZWwnLCB7IGF0dHJzOiB7Zm9yOiBcIm1pblwifSB9LCBcIk1pbnV0ZXMgcGVyIHNpZGU6XCIpLFxyXG4gICAgICAgICAgICAgICAgaCgnc3BhbiNtaW51dGVzJyksXHJcbiAgICAgICAgICAgICAgICBoKCdpbnB1dCNtaW4nLCB7IGNsYXNzOiB7IFwic2xpZGVyXCI6IHRydWUgfSxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wczoge25hbWU6IFwibWluXCIsIHR5cGU6IFwicmFuZ2VcIiwgbWluOiAwLCBtYXg6IDYwLCB2YWx1ZTogdk1pbn0sXHJcbiAgICAgICAgICAgICAgICAgICAgb246IHsgaW5wdXQ6IChlKSA9PiBzZXRNaW51dGVzKChlLnRhcmdldCBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZSkgfSxcclxuICAgICAgICAgICAgICAgICAgICBob29rOiB7aW5zZXJ0OiAodm5vZGUpID0+IHNldE1pbnV0ZXMoKHZub2RlLmVsbSBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZSkgfSxcclxuICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgaCgnbGFiZWwnLCB7IGF0dHJzOiB7Zm9yOiBcImluY1wifSB9LCBcIkluY3JlbWVudCBpbiBzZWNvbmRzOlwiKSxcclxuICAgICAgICAgICAgICAgIGgoJ3NwYW4jaW5jcmVtZW50JyksXHJcbiAgICAgICAgICAgICAgICBoKCdpbnB1dCNpbmMnLCB7IGNsYXNzOiB7XCJzbGlkZXJcIjogdHJ1ZSB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BzOiB7bmFtZTogXCJpbmNcIiwgdHlwZTogXCJyYW5nZVwiLCBtaW46IDAsIG1heDogMTUsIHZhbHVlOiB2SW5jfSxcclxuICAgICAgICAgICAgICAgICAgICBvbjogeyBpbnB1dDogKGUpID0+IHNldEluY3JlbWVudCgoZS50YXJnZXQgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWUpIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgaG9vazoge2luc2VydDogKHZub2RlKSA9PiBzZXRJbmNyZW1lbnQoKHZub2RlLmVsbSBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZSkgfSxcclxuICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgLy8gaWYgcGxheSB3aXRoIHRoZSBtYWNoaW5lXHJcbiAgICAgICAgICAgICAgICAvLyBBLkkuTGV2ZWwgKDEtOCBidXR0b25zKVxyXG4gICAgICAgICAgICAgICAgaCgnZm9ybSNhaWxldmVsJywgW1xyXG4gICAgICAgICAgICAgICAgaCgnaDQnLCBcIkEuSS4gTGV2ZWxcIiksXHJcbiAgICAgICAgICAgICAgICBoKCdkaXYuYWktcmFkaW8tZ3JvdXAnLCBbXHJcbiAgICAgICAgICAgICAgICAgICAgaCgnaW5wdXQjYWkxJywgeyBwcm9wczogeyB0eXBlOiBcInJhZGlvXCIsIG5hbWU6IFwibGV2ZWxcIiwgdmFsdWU6IFwiMVwiLCBjaGVja2VkOiB2TGV2ZWwgPT09IFwiMVwiID8gXCJjaGVja2VkXCIgOiBcIlwifSB9KSxcclxuICAgICAgICAgICAgICAgICAgICBoKCdsYWJlbC5sZXZlbC1haS5haTEnLCB7IGF0dHJzOiB7Zm9yOiBcImFpMVwifSB9LCBcIjFcIiksXHJcbiAgICAgICAgICAgICAgICAgICAgaCgnaW5wdXQjYWkyJywgeyBwcm9wczogeyB0eXBlOiBcInJhZGlvXCIsIG5hbWU6IFwibGV2ZWxcIiwgdmFsdWU6IFwiMlwiLCBjaGVja2VkOiB2TGV2ZWwgPT09IFwiMlwiID8gXCJjaGVja2VkXCIgOiBcIlwifSB9KSxcclxuICAgICAgICAgICAgICAgICAgICBoKCdsYWJlbC5sZXZlbC1haS5haTInLCB7IGF0dHJzOiB7Zm9yOiBcImFpMlwifSB9LCBcIjJcIiksXHJcbiAgICAgICAgICAgICAgICAgICAgaCgnaW5wdXQjYWkzJywgeyBwcm9wczogeyB0eXBlOiBcInJhZGlvXCIsIG5hbWU6IFwibGV2ZWxcIiwgdmFsdWU6IFwiM1wiLCBjaGVja2VkOiB2TGV2ZWwgPT09IFwiM1wiID8gXCJjaGVja2VkXCIgOiBcIlwifSB9KSxcclxuICAgICAgICAgICAgICAgICAgICBoKCdsYWJlbC5sZXZlbC1haS5haTMnLCB7IGF0dHJzOiB7Zm9yOiBcImFpM1wifSB9LCBcIjNcIiksXHJcbiAgICAgICAgICAgICAgICAgICAgaCgnaW5wdXQjYWk0JywgeyBwcm9wczogeyB0eXBlOiBcInJhZGlvXCIsIG5hbWU6IFwibGV2ZWxcIiwgdmFsdWU6IFwiNFwiLCBjaGVja2VkOiB2TGV2ZWwgPT09IFwiNFwiID8gXCJjaGVja2VkXCIgOiBcIlwifSB9KSxcclxuICAgICAgICAgICAgICAgICAgICBoKCdsYWJlbC5sZXZlbC1haS5haTQnLCB7IGF0dHJzOiB7Zm9yOiBcImFpNFwifSB9LCBcIjRcIiksXHJcbiAgICAgICAgICAgICAgICAgICAgaCgnaW5wdXQjYWk1JywgeyBwcm9wczogeyB0eXBlOiBcInJhZGlvXCIsIG5hbWU6IFwibGV2ZWxcIiwgdmFsdWU6IFwiNVwiLCBjaGVja2VkOiB2TGV2ZWwgPT09IFwiNVwiID8gXCJjaGVja2VkXCIgOiBcIlwifSB9KSxcclxuICAgICAgICAgICAgICAgICAgICBoKCdsYWJlbC5sZXZlbC1haS5haTUnLCB7IGF0dHJzOiB7Zm9yOiBcImFpNVwifSB9LCBcIjVcIiksXHJcbiAgICAgICAgICAgICAgICAgICAgaCgnaW5wdXQjYWk2JywgeyBwcm9wczogeyB0eXBlOiBcInJhZGlvXCIsIG5hbWU6IFwibGV2ZWxcIiwgdmFsdWU6IFwiNlwiLCBjaGVja2VkOiB2TGV2ZWwgPT09IFwiNlwiID8gXCJjaGVja2VkXCIgOiBcIlwifSB9KSxcclxuICAgICAgICAgICAgICAgICAgICBoKCdsYWJlbC5sZXZlbC1haS5haTYnLCB7IGF0dHJzOiB7Zm9yOiBcImFpNlwifSB9LCBcIjZcIiksXHJcbiAgICAgICAgICAgICAgICAgICAgaCgnaW5wdXQjYWk3JywgeyBwcm9wczogeyB0eXBlOiBcInJhZGlvXCIsIG5hbWU6IFwibGV2ZWxcIiwgdmFsdWU6IFwiN1wiLCBjaGVja2VkOiB2TGV2ZWwgPT09IFwiN1wiID8gXCJjaGVja2VkXCIgOiBcIlwifSB9KSxcclxuICAgICAgICAgICAgICAgICAgICBoKCdsYWJlbC5sZXZlbC1haS5haTcnLCB7IGF0dHJzOiB7Zm9yOiBcImFpN1wifSB9LCBcIjdcIiksXHJcbiAgICAgICAgICAgICAgICAgICAgaCgnaW5wdXQjYWk4JywgeyBwcm9wczogeyB0eXBlOiBcInJhZGlvXCIsIG5hbWU6IFwibGV2ZWxcIiwgdmFsdWU6IFwiOFwiLCBjaGVja2VkOiB2TGV2ZWwgPT09IFwiOFwiID8gXCJjaGVja2VkXCIgOiBcIlwifSB9KSxcclxuICAgICAgICAgICAgICAgICAgICBoKCdsYWJlbC5sZXZlbC1haS5haTgnLCB7IGF0dHJzOiB7Zm9yOiBcImFpOFwifSB9LCBcIjhcIiksXHJcbiAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICAgICAgaCgnZGl2I2NvbG9yLWJ1dHRvbi1ncm91cCcsIFtcclxuICAgICAgICAgICAgICAgICAgICBoKCdidXR0b24uaWNvbi5pY29uLWJsYWNrJywgeyBwcm9wczoge3R5cGU6IFwiYnV0dG9uXCIsIHRpdGxlOiBcIkJsYWNrXCJ9LCBvbjoge2NsaWNrOiAoKSA9PiB0aGlzLmNyZWF0ZVNlZWsoJ2InKSB9IH0pLFxyXG4gICAgICAgICAgICAgICAgICAgIGgoJ2J1dHRvbi5pY29uLmljb24tYWRqdXN0JywgeyBwcm9wczoge3R5cGU6IFwiYnV0dG9uXCIsIHRpdGxlOiBcIlJhbmRvbVwifSwgb246IHtjbGljazogKCkgPT4gdGhpcy5jcmVhdGVTZWVrKCdyJyl9IH0pLFxyXG4gICAgICAgICAgICAgICAgICAgIGgoJ2J1dHRvbi5pY29uLmljb24td2hpdGUnLCB7IHByb3BzOiB7dHlwZTogXCJidXR0b25cIiwgdGl0bGU6IFwiV2hpdGVcIn0sIG9uOiB7Y2xpY2s6ICgpID0+IHRoaXMuY3JlYXRlU2VlaygndycpfSB9KSxcclxuICAgICAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICBdKSxcclxuICAgICAgICAgIF0pLFxyXG4gICAgICAgIF0pLFxyXG4gICAgICAgIGgoJ2J1dHRvbicsIHsgY2xhc3M6IHsnbG9iYnktYnV0dG9uJzogdHJ1ZX0sIG9uOiB7XHJcbiAgICAgICAgICAgIGNsaWNrOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNoYWxsZW5nZUFJID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYWlsZXZlbCcpIS5zdHlsZS5kaXNwbGF5PSdub25lJztcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpZDAxJykhLnN0eWxlLmRpc3BsYXk9J2Jsb2NrJztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSB9LCBcIkNyZWF0ZSBhIGdhbWVcIiksXHJcbiAgICAgICAgaCgnYnV0dG9uJywgeyBjbGFzczogeydsb2JieS1idXR0b24nOiB0cnVlfSwgb246IHtcclxuICAgICAgICAgICAgY2xpY2s6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2hhbGxlbmdlQUkgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FpbGV2ZWwnKSEuc3R5bGUuZGlzcGxheT0naW5saW5lLWJsb2NrJztcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpZDAxJykhLnN0eWxlLmRpc3BsYXk9J2Jsb2NrJztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSB9LCBcIlBsYXkgd2l0aCB0aGUgbWFjaGluZVwiKSxcclxuICAgICAgICBdO1xyXG4gICAgfVxyXG5cclxuICAgIG9uQ2xpY2tTZWVrKHNlZWspIHtcclxuICAgICAgICBpZiAoc2Vla1tcInVzZXJcIl0gPT09IHRoaXMubW9kZWxbXCJ1c2VybmFtZVwiXSkge1xyXG4gICAgICAgICAgICB0aGlzLmRvU2VuZCh7IHR5cGU6IFwiZGVsZXRlX3NlZWtcIiwgc2Vla0lEOiBzZWVrW1wic2Vla0lEXCJdLCBwbGF5ZXI6IHRoaXMubW9kZWxbXCJ1c2VybmFtZVwiXSB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmRvU2VuZCh7IHR5cGU6IFwiYWNjZXB0X3NlZWtcIiwgc2Vla0lEOiBzZWVrW1wic2Vla0lEXCJdLCBwbGF5ZXI6IHRoaXMubW9kZWxbXCJ1c2VybmFtZVwiXSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmVuZGVyU2Vla3Moc2Vla3MpIHtcclxuICAgICAgICAvLyBUT0RPOiBmaXggaGVhZGVyIGFuZCBkYXRhIHJvdyBjb2xvbW5zXHJcbiAgICAgICAgLy8gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMzcyNzIzMzEvaHRtbC10YWJsZS13aXRoLWZpeGVkLWhlYWRlci1hbmQtZm9vdGVyLWFuZC1zY3JvbGxhYmxlLWJvZHktd2l0aG91dC1maXhlZC13aWR0aHNcclxuICAgICAgICBjb25zdCBoZWFkZXIgPSBoKCd0aGVhZCcsIFtoKCd0cicsXHJcbiAgICAgICAgICAgIFtoKCd0aCcsICdQbGF5ZXInKSxcclxuICAgICAgICAgICAgIGgoJ3RoJywgJ0NvbG9yJyksXHJcbiAgICAgICAgICAgICBoKCd0aCcsICdSYXRpbmcnKSxcclxuICAgICAgICAgICAgIGgoJ3RoJywgJ1RpbWUnKSxcclxuICAgICAgICAgICAgIGgoJ3RoJywgJyAgICAnKSxcclxuICAgICAgICAgICAgIGgoJ3RoJywgJ1ZhcmlhbnQnKSxcclxuICAgICAgICAgICAgIGgoJ3RoJywgJ01vZGUnKV0pXSk7XHJcbiAgICAgICAgY29uc3QgY29sb3JJY29uID0gKGNvbG9yKSA9PiB7IHJldHVybiBoKCdpJywge2F0dHJzOiB7XCJkYXRhLWljb25cIjogY29sb3IgPT09IFwid1wiID8gXCJjXCIgOiBjb2xvciA9PT0gXCJiXCIgPyBcImJcIiA6IFwiYVwifX0gKTsgfTtcclxuICAgICAgICB2YXIgcm93cyA9IHNlZWtzLm1hcCgoc2VlaykgPT4gaChcclxuICAgICAgICAgICAgJ3RyJyxcclxuICAgICAgICAgICAgeyBvbjogeyBjbGljazogKCkgPT4gdGhpcy5vbkNsaWNrU2VlayhzZWVrKSB9IH0sXHJcbiAgICAgICAgICAgIFtoKCd0ZCcsIHNlZWtbXCJ1c2VyXCJdKSxcclxuICAgICAgICAgICAgIGgoJ3RkJywgW2NvbG9ySWNvbihzZWVrW1wiY29sb3JcIl0pXSksXHJcbiAgICAgICAgICAgICBoKCd0ZCcsICcxNTAwPycpLFxyXG4gICAgICAgICAgICAgaCgndGQnLCBzZWVrW1widGNcIl0pLFxyXG4gICAgICAgICAgICAgaCgndGQnLCB7YXR0cnM6IHtcImRhdGEtaWNvblwiOiBWQVJJQU5UU1tzZWVrW1widmFyaWFudFwiXV0uaWNvbn0sIGNsYXNzOiB7XCJpY29uXCI6IHRydWV9fSApLFxyXG4gICAgICAgICAgICAgaCgndGQnLCB7YXR0cnM6IHtcImRhdGEtaWNvblwiOiAoc2Vlay5jaGVzczk2MCkgPyBcIlZcIiA6IFwiXCJ9LCBjbGFzczoge1wiaWNvblwiOiB0cnVlfX0gKSxcclxuICAgICAgICAgICAgIGgoJ3RkJywgc2Vla1tcInZhcmlhbnRcIl0pLFxyXG4gICAgICAgICAgICAgaCgndGQnLCBzZWVrW1wicmF0ZWRcIl0pIF0pXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgcmV0dXJuIFtoZWFkZXIsIGgoJ3Rib2R5Jywgcm93cyldO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25Nc2dHZXRTZWVrcyA9IChtc2cpID0+IHtcclxuICAgICAgICB0aGlzLnNlZWtzID0gbXNnLnNlZWtzO1xyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwiISEhISBnb3QgZ2V0X3NlZWtzIG1zZzpcIiwgbXNnKTtcclxuICAgICAgICBjb25zdCBvbGRWTm9kZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzZWVrcycpO1xyXG4gICAgICAgIGlmIChvbGRWTm9kZSBpbnN0YW5jZW9mIEVsZW1lbnQpIHtcclxuICAgICAgICAgICAgb2xkVk5vZGUuaW5uZXJIVE1MID0gJyc7XHJcbiAgICAgICAgICAgIHBhdGNoKG9sZFZOb2RlIGFzIEhUTUxFbGVtZW50LCBoKCd0YWJsZSNzZWVrcycsIHRoaXMucmVuZGVyU2Vla3MobXNnLnNlZWtzKSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uTXNnTmV3R2FtZSA9IChtc2cpID0+IHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIkxvYmJ5Q29udHJvbGxlci5vbk1zZ05ld0dhbWUoKVwiLCB0aGlzLm1vZGVsW1wiZ2FtZUlkXCJdKVxyXG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5hc3NpZ24odGhpcy5tb2RlbFtcImhvbWVcIl0gKyAnLycgKyBtc2dbXCJnYW1lSWRcIl0pO1xyXG59XHJcblxyXG4gICAgcHJpdmF0ZSBvbk1zZ1VzZXJDb25uZWN0ZWQgPSAobXNnKSA9PiB7XHJcbiAgICAgICAgdGhpcy5tb2RlbFtcInVzZXJuYW1lXCJdID0gbXNnW1widXNlcm5hbWVcIl07XHJcbiAgICAgICAgcmVuZGVyVXNlcm5hbWUodGhpcy5tb2RlbFtcImhvbWVcIl0sIHRoaXMubW9kZWxbXCJ1c2VybmFtZVwiXSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbk1zZ0NoYXQgPSAobXNnKSA9PiB7XHJcbiAgICAgICAgaWYgKG1zZy51c2VyICE9PSB0aGlzLm1vZGVsW1widXNlcm5hbWVcIl0pIHtcclxuICAgICAgICAgICAgY2hhdE1lc3NhZ2UobXNnLnVzZXIsIG1zZy5tZXNzYWdlLCBcImxvYmJ5Y2hhdFwiKTtcclxuICAgICAgICAgICAgaWYgKG1zZy51c2VyLmxlbmd0aCAhPT0gMCAmJiBtc2cudXNlciAhPT0gJ19zZXJ2ZXInKSBzb3VuZC5jaGF0KCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25Nc2dGdWxsQ2hhdCA9IChtc2cpID0+IHtcclxuICAgICAgICBtc2cubGluZXMuZm9yRWFjaCgobGluZSkgPT4ge2NoYXRNZXNzYWdlKGxpbmUudXNlciwgbGluZS5tZXNzYWdlLCBcImxvYmJ5Y2hhdFwiKTt9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uTXNnUGluZyA9IChtc2cpID0+IHtcclxuICAgICAgICB0aGlzLmRvU2VuZCh7dHlwZTogXCJwb25nXCIsIHRpbWVzdGFtcDogbXNnLnRpbWVzdGFtcH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25Nc2dTaHV0ZG93biA9IChtc2cpID0+IHtcclxuICAgICAgICBhbGVydChtc2cubWVzc2FnZSk7XHJcbiAgICB9XHJcblxyXG4gICAgb25NZXNzYWdlIChldnQpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIjwrKysgbG9iYnkgb25NZXNzYWdlKCk6XCIsIGV2dC5kYXRhKTtcclxuICAgICAgICB2YXIgbXNnID0gSlNPTi5wYXJzZShldnQuZGF0YSk7XHJcbiAgICAgICAgc3dpdGNoIChtc2cudHlwZSkge1xyXG4gICAgICAgICAgICBjYXNlIFwiZ2V0X3NlZWtzXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uTXNnR2V0U2Vla3MobXNnKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwibmV3X2dhbWVcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMub25Nc2dOZXdHYW1lKG1zZyk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcImxvYmJ5X3VzZXJfY29ubmVjdGVkXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uTXNnVXNlckNvbm5lY3RlZChtc2cpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJsb2JieWNoYXRcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMub25Nc2dDaGF0KG1zZyk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcImZ1bGxjaGF0XCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uTXNnRnVsbENoYXQobXNnKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwicGluZ1wiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5vbk1zZ1BpbmcobXNnKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwic2h1dGRvd25cIjpcclxuICAgICAgICAgICAgICAgIHRoaXMub25Nc2dTaHV0ZG93bihtc2cpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBydW5TZWVrcyh2bm9kZTogVk5vZGUsIG1vZGVsKSB7XHJcbiAgICBjb25zdCBlbCA9IHZub2RlLmVsbSBhcyBIVE1MRWxlbWVudDtcclxuICAgIGNvbnN0IGN0cmwgPSBuZXcgTG9iYnlDb250cm9sbGVyKGVsLCBtb2RlbCk7XHJcbiAgICBjb25zb2xlLmxvZyhcImxvYmJ5VmlldygpIC0+IHJ1blNlZWtzKClcIiwgZWwsIG1vZGVsLCBjdHJsKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGxvYmJ5Vmlldyhtb2RlbCk6IFZOb2RlW10ge1xyXG4gICAgLy8gR2V0IHRoZSBtb2RhbFxyXG4gICAgY29uc3QgbW9kYWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaWQwMScpITtcclxuXHJcbiAgICAvLyBXaGVuIHRoZSB1c2VyIGNsaWNrcyBhbnl3aGVyZSBvdXRzaWRlIG9mIHRoZSBtb2RhbCwgY2xvc2UgaXRcclxuICAgIHdpbmRvdy5vbmNsaWNrID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICBpZiAoZXZlbnQudGFyZ2V0ID09IG1vZGFsKSB7XHJcbiAgICAgICAgICAgIG1vZGFsLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIFtoKCdhc2lkZS5zaWRlYmFyLWZpcnN0JywgWyBoKCdkaXYubG9iYnljaGF0I2xvYmJ5Y2hhdCcpIF0pLFxyXG4gICAgICAgICAgICBoKCdtYWluLm1haW4nLCBbIGgoJ3RhYmxlI3NlZWtzJywge2hvb2s6IHsgaW5zZXJ0OiAodm5vZGUpID0+IHJ1blNlZWtzKHZub2RlLCBtb2RlbCkgfSB9KSBdKSxcclxuICAgICAgICAgICAgaCgnYXNpZGUuc2lkZWJhci1zZWNvbmQnLCBbIGgoJ3VsI3NlZWtidXR0b25zJykgXSksXHJcbiAgICAgICAgICAgIGgoJ3VuZGVyLWxlZnQnLCBcIiMgb2YgdXNlcnNcIiksXHJcbiAgICAgICAgICAgIGgoJ3VuZGVyLWxvYmJ5JyksXHJcbiAgICAgICAgICAgIGgoJ3VuZGVyLXJpZ2h0JywgW1xyXG4gICAgICAgICAgICAgICAgaCgnYScsIHtcclxuICAgICAgICAgICAgICAgICAgICBjbGFzczogeydkb25hdGUtYnV0dG9uJzogdHJ1ZX0sXHJcbiAgICAgICAgICAgICAgICAgICAgYXR0cnM6IHtocmVmOiAnaHR0cHM6Ly93d3cucGF5cGFsLmNvbS9jZ2ktYmluL3dlYnNjcj9jbWQ9X3MteGNsaWNrJmhvc3RlZF9idXR0b25faWQ9TkM3M0pYUkJRTlRBTiZzb3VyY2U9dXJsJ31cclxuICAgICAgICAgICAgICAgICAgICB9LCAnRGlyZWN0bHkgc3VwcG9ydCB1cycpXHJcbiAgICAgICAgICAgIF0pLFxyXG4gICAgICAgIF07XHJcbn1cclxuIiwiaW1wb3J0IHsgaW5pdCB9IGZyb20gJ3NuYWJiZG9tJztcclxuaW1wb3J0IGtsYXNzIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvY2xhc3MnO1xyXG5pbXBvcnQgYXR0cmlidXRlcyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL2F0dHJpYnV0ZXMnO1xyXG5pbXBvcnQgcHJvcGVydGllcyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL3Byb3BzJztcclxuaW1wb3J0IGxpc3RlbmVycyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL2V2ZW50bGlzdGVuZXJzJztcclxuaW1wb3J0IGggZnJvbSAnc25hYmJkb20vaCc7XHJcbmltcG9ydCB7IFZOb2RlIH0gZnJvbSAnc25hYmJkb20vdm5vZGUnO1xyXG5cclxuY29uc3QgcGF0Y2ggPSBpbml0KFtrbGFzcywgYXR0cmlidXRlcywgcHJvcGVydGllcywgbGlzdGVuZXJzXSk7XHJcblxyXG5pbXBvcnQgeyBhYm91dFZpZXcgfSBmcm9tICcuL2Fib3V0JztcclxuaW1wb3J0IHsgbG9iYnlWaWV3IH0gZnJvbSAnLi9sb2JieSc7XHJcbmltcG9ydCB7IHJvdW5kVmlldyB9IGZyb20gJy4vcm91bmQnO1xyXG5pbXBvcnQgeyBhbmFseXNpc1ZpZXcgfSBmcm9tICcuL2FuYWx5c2lzJztcclxuaW1wb3J0IHsgcGxheWVyc1ZpZXcgfSBmcm9tICcuL3BsYXllcnMnO1xyXG5pbXBvcnQgeyBwcm9maWxlVmlldyB9IGZyb20gJy4vcHJvZmlsZSc7XHJcblxyXG5jb25zdCBtb2RlbCA9IHtob21lOiBcIlwiLCB1c2VybmFtZTogXCJcIiwgYW5vbjogXCJcIiwgdmFyaWFudDogXCJcIiwgZ2FtZUlkOiAwLCB3cGxheWVyOiBcIlwiLCBicGxheWVyOiBcIlwiLCBmZW46IFwiXCIsIGJhc2U6IFwiXCIsIGluYzogXCJcIiwgc2Vla3M6IFtdLCB0djogXCJcIiwgcHJvZmlsZWlkOiBcIlwiLCBzdGF0dXM6IFwiXCJ9O1xyXG5cclxudmFyIGdldENvb2tpZSA9IGZ1bmN0aW9uKG5hbWUpIHtcclxuICAgIHZhciBjb29raWVzID0gZG9jdW1lbnQuY29va2llLnNwbGl0KCc7Jyk7XHJcbiAgICBmb3IodmFyIGk9MCA7IGkgPCBjb29raWVzLmxlbmd0aCA7ICsraSkge1xyXG4gICAgICAgIHZhciBwYWlyID0gY29va2llc1tpXS50cmltKCkuc3BsaXQoJz0nKTtcclxuICAgICAgICBpZihwYWlyWzBdID09IG5hbWUpXHJcbiAgICAgICAgICAgIHJldHVybiBwYWlyWzFdO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIFwiXCI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB2aWV3KGVsLCBtb2RlbCk6IFZOb2RlIHtcclxuICAgIGNvbnN0IHVzZXIgPSBnZXRDb29raWUoXCJ1c2VyXCIpO1xyXG4gICAgaWYgKHVzZXIgIT09IFwiXCIpIG1vZGVsW1widXNlcm5hbWVcIl0gPSB1c2VyO1xyXG5cclxuICAgIG1vZGVsW1wiaG9tZVwiXSA9IGVsLmdldEF0dHJpYnV0ZShcImRhdGEtaG9tZVwiKTtcclxuICAgIG1vZGVsW1wiYW5vblwiXSA9IGVsLmdldEF0dHJpYnV0ZShcImRhdGEtYW5vblwiKTtcclxuICAgIG1vZGVsW1wicHJvZmlsZWlkXCJdID0gZWwuZ2V0QXR0cmlidXRlKFwiZGF0YS1wcm9maWxlXCIpO1xyXG4gICAgbW9kZWxbXCJ2YXJpYW50XCJdID0gZWwuZ2V0QXR0cmlidXRlKFwiZGF0YS12YXJpYW50XCIpO1xyXG4gICAgbW9kZWxbXCJjaGVzczk2MFwiXSA9IGVsLmdldEF0dHJpYnV0ZShcImRhdGEtY2hlc3M5NjBcIik7XHJcbiAgICBtb2RlbFtcImxldmVsXCJdID0gZWwuZ2V0QXR0cmlidXRlKFwiZGF0YS1sZXZlbFwiKTtcclxuICAgIG1vZGVsW1widXNlcm5hbWVcIl0gPSB1c2VyICE9PSBcIlwiID8gdXNlciA6IGVsLmdldEF0dHJpYnV0ZShcImRhdGEtdXNlclwiKTtcclxuICAgIG1vZGVsW1wiZ2FtZUlkXCJdID0gZWwuZ2V0QXR0cmlidXRlKFwiZGF0YS1nYW1laWRcIik7XHJcbiAgICBtb2RlbFtcIndwbGF5ZXJcIl0gPSBlbC5nZXRBdHRyaWJ1dGUoXCJkYXRhLXdwbGF5ZXJcIik7XHJcbiAgICBtb2RlbFtcInd0aXRsZVwiXSA9IGVsLmdldEF0dHJpYnV0ZShcImRhdGEtd3RpdGxlXCIpO1xyXG4gICAgbW9kZWxbXCJicGxheWVyXCJdID0gZWwuZ2V0QXR0cmlidXRlKFwiZGF0YS1icGxheWVyXCIpO1xyXG4gICAgbW9kZWxbXCJidGl0bGVcIl0gPSBlbC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWJ0aXRsZVwiKTtcclxuICAgIG1vZGVsW1wiZmVuXCJdID0gZWwuZ2V0QXR0cmlidXRlKFwiZGF0YS1mZW5cIik7XHJcbiAgICBtb2RlbFtcImJhc2VcIl0gPSBlbC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWJhc2VcIik7XHJcbiAgICBtb2RlbFtcImluY1wiXSA9IGVsLmdldEF0dHJpYnV0ZShcImRhdGEtaW5jXCIpO1xyXG4gICAgbW9kZWxbXCJyZXN1bHRcIl0gPSBlbC5nZXRBdHRyaWJ1dGUoXCJkYXRhLXJlc3VsdFwiKTtcclxuICAgIG1vZGVsW1wic3RhdHVzXCJdID0gZWwuZ2V0QXR0cmlidXRlKFwiZGF0YS1zdGF0dXNcIik7XHJcbiAgICBtb2RlbFtcImRhdGVcIl0gPSBlbC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWRhdGVcIik7XHJcbiAgICBtb2RlbFtcInR2XCJdID0gZWwuZ2V0QXR0cmlidXRlKFwiZGF0YS12aWV3XCIpID09PSAndHYnO1xyXG5cclxuICAgIHN3aXRjaCAoZWwuZ2V0QXR0cmlidXRlKFwiZGF0YS12aWV3XCIpKSB7XHJcbiAgICBjYXNlICdhYm91dCc6XHJcbiAgICAgICAgcmV0dXJuIGgoJ2RpdiNwbGFjZWhvbGRlci5tYWluLXdyYXBwZXInLCBhYm91dFZpZXcobW9kZWwpKTtcclxuICAgIGNhc2UgJ2hvd3RvcGxheSc6XHJcbiAgICAgICAgcmV0dXJuIGgoJ2lmcmFtZScsIHtwcm9wczoge3NyYzogbW9kZWxbXCJob21lXCJdICsgXCIvc3RhdGljL2RvY3MvdmFyaWFudHMuaHRtbFwiLCBoZWlnaHQ6IFwiMTAwJVwiLCB3aWR0aDpcIjEwMCVcIiwgc2VhbWxlc3M6IFwiXCJ9fSk7XHJcbiAgICBjYXNlICdwbGF5ZXJzJzpcclxuICAgICAgICByZXR1cm4gaCgnZGl2I3BsYWNlaG9sZGVyLnBsYXllcnMtd3JhcHBlcicsIHBsYXllcnNWaWV3KG1vZGVsKSk7XHJcbiAgICBjYXNlICdwcm9maWxlJzpcclxuICAgICAgICByZXR1cm4gaCgnZGl2I3BsYWNlaG9sZGVyLnByb2ZpbGUtd3JhcHBlcicsIHByb2ZpbGVWaWV3KG1vZGVsKSk7XHJcbiAgICBjYXNlICd0dic6XHJcbiAgICBjYXNlICdyb3VuZCc6XHJcbiAgICAgICAgcmV0dXJuIGgoJ2RpdiNwbGFjZWhvbGRlci5tYWluLXdyYXBwZXInLCByb3VuZFZpZXcobW9kZWwpKTtcclxuICAgIGNhc2UgJ2FuYWx5c2lzJzpcclxuICAgICAgICByZXR1cm4gaCgnZGl2I3BsYWNlaG9sZGVyLm1haW4td3JhcHBlcicsIGFuYWx5c2lzVmlldyhtb2RlbCkpO1xyXG4gICAgY2FzZSAndGhhbmtzJzpcclxuICAgICAgICByZXR1cm4gaCgnZGl2I3BsYWNlaG9sZGVyLm1haW4td3JhcHBlcicsIGgoJ2gyJywgJ1RoYW5rIHlvdSBmb3IgeW91ciBzdXBwb3J0IScpKTtcclxuICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgcmV0dXJuIGgoJ2RpdiNwbGFjZWhvbGRlci5tYWluLXdyYXBwZXInLCBsb2JieVZpZXcobW9kZWwpKTtcclxuICAgIH1cclxufVxyXG5cclxuY29uc3QgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHljaGVzcy12YXJpYW50cycpO1xyXG5pZiAoZWwgaW5zdGFuY2VvZiBFbGVtZW50KSB7XHJcbiAgICBwYXRjaChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxhY2Vob2xkZXInKSBhcyBIVE1MRWxlbWVudCwgdmlldyhlbCwgbW9kZWwpKTtcclxufVxyXG4iLCJpbXBvcnQgeyBpbml0IH0gZnJvbSBcInNuYWJiZG9tXCI7XG5pbXBvcnQga2xhc3MgZnJvbSAnc25hYmJkb20vbW9kdWxlcy9jbGFzcyc7XG5pbXBvcnQgYXR0cmlidXRlcyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL2F0dHJpYnV0ZXMnO1xuaW1wb3J0IHByb3BlcnRpZXMgZnJvbSAnc25hYmJkb20vbW9kdWxlcy9wcm9wcyc7XG5pbXBvcnQgbGlzdGVuZXJzIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvZXZlbnRsaXN0ZW5lcnMnO1xuXG5jb25zdCBwYXRjaCA9IGluaXQoW2tsYXNzLCBhdHRyaWJ1dGVzLCBwcm9wZXJ0aWVzLCBsaXN0ZW5lcnNdKTtcblxuaW1wb3J0IGggZnJvbSAnc25hYmJkb20vaCc7XG5cbmltcG9ydCB7IGdlYXJCdXR0b24sIHRvZ2dsZU9yaWVudGF0aW9uIH0gZnJvbSAnLi9zZXR0aW5ncyc7XG5pbXBvcnQgUm91bmRDb250cm9sbGVyIGZyb20gJy4vcm91bmRDdHJsJztcblxuXG5leHBvcnQgZnVuY3Rpb24gc2VsZWN0TW92ZSAoY3RybCwgcGx5KSB7XG4gICAgY29uc29sZS5sb2coXCJzZWxjdE1vdmUoKVwiLCBwbHkpO1xuICAgIGNvbnN0IGFjdGl2ZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2xpLm1vdmUuYWN0aXZlJyk7XG4gICAgaWYgKGFjdGl2ZSkgYWN0aXZlLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuXG4gICAgY29uc3QgZWxQbHkgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGBsaS5tb3ZlW3BseT1cIiR7cGx5fVwiXWApO1xuICAgIGlmIChlbFBseSkgZWxQbHkuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG5cbiAgICBjdHJsLmdvUGx5KHBseSlcbiAgICBzY3JvbGxUb1BseShjdHJsKTtcbn1cblxuZnVuY3Rpb24gc2Nyb2xsVG9QbHkgKGN0cmwpIHtcbiAgICBpZiAoY3RybC5zdGVwcy5sZW5ndGggPCA5KSByZXR1cm47XG4gICAgY29uc3QgbW92ZXNFbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtb3ZlcycpIGFzIEhUTUxFbGVtZW50O1xuICAgIGNvbnN0IHBseUVsID0gbW92ZXNFbC5xdWVyeVNlbGVjdG9yKCdsaS5tb3ZlLmFjdGl2ZScpIGFzIEhUTUxFbGVtZW50IHwgdW5kZWZpbmVkO1xuXG4gICAgY29uc3QgbW92ZWxpc3RibG9ja0VsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21vdmVsaXN0LWJsb2NrJykgYXMgSFRNTEVsZW1lbnQ7XG4gICAgbGV0IHN0OiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgICBpZiAoY3RybC5wbHkgPT0gMCkgc3QgPSAwO1xuICAgIGVsc2UgaWYgKGN0cmwucGx5ID09IGN0cmwuc3RlcHMubGVuZ3RoIC0gMSkgc3QgPSA5OTk5OTtcbiAgICBlbHNlIGlmIChwbHlFbCkgc3QgPSBwbHlFbC5vZmZzZXRUb3AgLSBtb3ZlbGlzdGJsb2NrRWwub2Zmc2V0SGVpZ2h0ICsgcGx5RWwub2Zmc2V0SGVpZ2h0O1xuXG4gICAgaWYgKHR5cGVvZiBzdCA9PSAnbnVtYmVyJykge1xuICAgICAgICBpZiAocGx5RWwgJiYgY3RybCBpbnN0YW5jZW9mIFJvdW5kQ29udHJvbGxlcikge1xuICAgICAgICAgICAgdmFyIGlzU21vb3RoU2Nyb2xsU3VwcG9ydGVkID0gJ3Njcm9sbEJlaGF2aW9yJyBpbiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGU7XG4gICAgICAgICAgICBpZihpc1Ntb290aFNjcm9sbFN1cHBvcnRlZCkge1xuICAgICAgICAgICAgICAgIHBseUVsLnNjcm9sbEludG9WaWV3KHtiZWhhdmlvcjogXCJzbW9vdGhcIiwgYmxvY2s6IFwiY2VudGVyXCJ9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGx5RWwuc2Nyb2xsSW50b1ZpZXcoZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJzY3JvbGxUb1BseVwiLCBjdHJsLnBseSwgc3QpO1xuICAgICAgICAgICAgbW92ZWxpc3RibG9ja0VsLnNjcm9sbFRvcCA9IHN0O1xuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbW92ZWxpc3RWaWV3IChjdHJsKSB7XG4gICAgY3RybC52Z2VhciA9IGdlYXJCdXR0b24oY3RybCk7XG4gICAgdmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtb3ZlLWNvbnRyb2xzJykgYXMgSFRNTEVsZW1lbnQ7XG4gICAgY3RybC5tb3ZlQ29udHJvbHMgPSBwYXRjaChjb250YWluZXIsIGgoJ2Rpdi5idG4tY29udHJvbHMnLCBbXG4gICAgICAgICAgICBoKCdidXR0b24nLCB7IG9uOiB7IGNsaWNrOiAoKSA9PiB0b2dnbGVPcmllbnRhdGlvbihjdHJsKSB9IH0sIFtoKCdpJywge3Byb3BzOiB7dGl0bGU6ICdGbGlwIGJvYXJkJ30sIGNsYXNzOiB7XCJpY29uXCI6IHRydWUsIFwiaWNvbi1yZWZyZXNoXCI6IHRydWV9IH0gKSwgXSksXG4gICAgICAgICAgICBoKCdidXR0b24nLCB7IG9uOiB7IGNsaWNrOiAoKSA9PiBzZWxlY3RNb3ZlKGN0cmwsIDApIH0gfSwgW2goJ2knLCB7Y2xhc3M6IHtcImljb25cIjogdHJ1ZSwgXCJpY29uLWZhc3QtYmFja3dhcmRcIjogdHJ1ZX0gfSApLCBdKSxcbiAgICAgICAgICAgIGgoJ2J1dHRvbicsIHsgb246IHsgY2xpY2s6ICgpID0+IHNlbGVjdE1vdmUoY3RybCwgTWF0aC5tYXgoY3RybC5wbHkgLSAxLCAwKSkgfSB9LCBbaCgnaScsIHtjbGFzczoge1wiaWNvblwiOiB0cnVlLCBcImljb24tc3RlcC1iYWNrd2FyZFwiOiB0cnVlfSB9ICksIF0pLFxuICAgICAgICAgICAgaCgnYnV0dG9uJywgeyBvbjogeyBjbGljazogKCkgPT4gc2VsZWN0TW92ZShjdHJsLCBNYXRoLm1pbihjdHJsLnBseSArIDEsIGN0cmwuc3RlcHMubGVuZ3RoIC0gMSkpIH0gfSwgW2goJ2knLCB7Y2xhc3M6IHtcImljb25cIjogdHJ1ZSwgXCJpY29uLXN0ZXAtZm9yd2FyZFwiOiB0cnVlfSB9ICksIF0pLFxuICAgICAgICAgICAgaCgnYnV0dG9uJywgeyBvbjogeyBjbGljazogKCkgPT4gc2VsZWN0TW92ZShjdHJsLCBjdHJsLnN0ZXBzLmxlbmd0aCAtIDEpIH0gfSwgW2goJ2knLCB7Y2xhc3M6IHtcImljb25cIjogdHJ1ZSwgXCJpY29uLWZhc3QtZm9yd2FyZFwiOiB0cnVlfSB9ICksIF0pLFxuICAgICAgICAgICAgY3RybC52Z2VhcixcbiAgICAgICAgXSlcbiAgICApO1xuICAgIGlmIChjdHJsIGluc3RhbmNlb2YgUm91bmRDb250cm9sbGVyKSB7XG4gICAgICAgIHJldHVybiBoKCdkaXYjbW92ZXMnLCBbaCgnb2wubW92ZWxpc3QjbW92ZWxpc3QnKV0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBoKCdkaXYuYW5hbCNtb3ZlcycsIFtoKCdvbC5tb3ZlbGlzdCNtb3ZlbGlzdCcpXSk7XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlTW92ZWxpc3QgKGN0cmwpIHtcbiAgICB2YXIgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21vdmVsaXN0JykgYXMgSFRNTEVsZW1lbnQ7XG4gICAgY29uc3QgcGx5ID0gY3RybC5zdGVwcy5sZW5ndGggLSAxO1xuICAgIGNvbnN0IG1vdmUgPSBjdHJsLnN0ZXBzW3BseV1bJ3NhbiddO1xuICAgIGNvbnN0IGFjdGl2ZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2xpLm1vdmUuYWN0aXZlJyk7XG4gICAgaWYgKGFjdGl2ZSkgYWN0aXZlLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuICAgIGNvbnN0IGVsID0gaCgnbGkubW92ZScsIHtjbGFzczoge2FjdGl2ZTogdHJ1ZX0sIGF0dHJzOiB7cGx5OiBwbHl9LCBvbjogeyBjbGljazogKCkgPT4gc2VsZWN0TW92ZShjdHJsLCBwbHkpIH19LCBtb3ZlKTtcbiAgICBpZiAocGx5ICUgMiA9PSAwKSB7XG4gICAgICAgIHBhdGNoKGNvbnRhaW5lciwgaCgnb2wubW92ZWxpc3QjbW92ZWxpc3QnLCBbZWxdKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcGF0Y2goY29udGFpbmVyLCBoKCdvbC5tb3ZlbGlzdCNtb3ZlbGlzdCcsIFtoKCdsaS5tb3ZlLmNvdW50ZXInLCAocGx5ICsgMSkgLyAyKSwgZWxdKSk7XG4gICAgfVxuICAgIHNjcm9sbFRvUGx5KGN0cmwpO1xufSIsImltcG9ydCBoIGZyb20gJ3NuYWJiZG9tL2gnO1xuXG5leHBvcnQgZnVuY3Rpb24gcGxheWVyKGlkLCB0aXRsZSwgbmFtZSwgbGV2ZWwpIHtcbiAgICByZXR1cm4gaCgncm91bmQtcGxheWVyJywgW1xuICAgICAgICBoKCdkaXYucGxheWVyLWRhdGEnLCBbXG4gICAgICAgICAgICBoKCdpLXNpZGUub25saW5lIycgKyBpZCwge2NsYXNzOiB7XCJpY29uXCI6IHRydWUsIFwiaWNvbi1vbmxpbmVcIjogZmFsc2UsIFwiaWNvbi1vZmZsaW5lXCI6IHRydWV9fSksXG4gICAgICAgICAgICBoKCdwbGF5ZXInLCBbXG4gICAgICAgICAgICAgICAgaCgnYS51c2VyLWxpbmsnLCB7YXR0cnM6IHtocmVmOiAnL0AvJyArIG5hbWV9fSwgW1xuICAgICAgICAgICAgICAgICAgICBoKCdwbGF5ZXItdGl0bGUnLCBcIiBcIiArIHRpdGxlICsgXCIgXCIpLFxuICAgICAgICAgICAgICAgICAgICBuYW1lICsgKCh0aXRsZSA9PT0gXCJCT1RcIiAmJiBsZXZlbCA+IDApID8gJyBsZXZlbCAnICsgbGV2ZWw6ICcnKSxcbiAgICAgICAgICAgICAgICBdKSxcbiAgICAgICAgICAgICAgICBoKCdyYXRpbmcnLCBcIjE1MDA/XCIpLFxuICAgICAgICAgICAgXSksXG4gICAgICAgIF0pLFxuICAgIF0pO1xufVxuIiwiaW1wb3J0IHsgaW5pdCB9IGZyb20gJ3NuYWJiZG9tJztcclxuaW1wb3J0IGtsYXNzIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvY2xhc3MnO1xyXG5pbXBvcnQgYXR0cmlidXRlcyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL2F0dHJpYnV0ZXMnO1xyXG5pbXBvcnQgcHJvcGVydGllcyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL3Byb3BzJztcclxuaW1wb3J0IGxpc3RlbmVycyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL2V2ZW50bGlzdGVuZXJzJztcclxuXHJcbmNvbnN0IHBhdGNoID0gaW5pdChba2xhc3MsIGF0dHJpYnV0ZXMsIHByb3BlcnRpZXMsIGxpc3RlbmVyc10pO1xyXG5cclxuaW1wb3J0IGggZnJvbSAnc25hYmJkb20vaCc7XHJcbmltcG9ydCB7IFZOb2RlIH0gZnJvbSAnc25hYmJkb20vdm5vZGUnO1xyXG5cclxuaW1wb3J0IHsgcmVuZGVyVXNlcm5hbWUgfSBmcm9tICcuL3VzZXInO1xyXG5cclxuXHJcbmZ1bmN0aW9uIHJlbmRlclBsYXllcnMobW9kZWwsIHBsYXllcnMpIHtcclxuICAgIGNvbnNvbGUubG9nKFwicGxheWVyc1wiLCBtb2RlbCwgcGxheWVycyk7XHJcbiAgICBjb25zdCBoZWFkZXIgPSBoKCd0aGVhZCcsIFtoKCd0cicsIFtoKCd0aCcsICdQbGF5ZXJzJyksIF0pXSk7XHJcbiAgICB2YXIgcm93cyA9IHBsYXllcnMubWFwKFxyXG4gICAgICAgIChwbGF5ZXIpID0+IGgoJ3RyJywgW1xyXG4gICAgICAgICAgICBoKCd0ZC5wbGF5ZXItZGF0YScsIFtcclxuICAgICAgICAgICAgICAgIGgoJ2ktc2lkZS5vbmxpbmUnLCB7Y2xhc3M6IHtcImljb25cIjogdHJ1ZSwgXCJpY29uLW9ubGluZVwiOiBwbGF5ZXJbXCJvbmxpbmVcIl0sIFwiaWNvbi1vZmZsaW5lXCI6ICFwbGF5ZXJbXCJvbmxpbmVcIl19fSksXHJcbiAgICAgICAgICAgICAgICBoKCdwbGF5ZXInLCBbXHJcbiAgICAgICAgICAgICAgICAgICAgaCgnYS51c2VyLWxpbmsnLCB7YXR0cnM6IHtocmVmOiAnL0AvJyArIHBsYXllcltcIl9pZFwiXX19LCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGgoJ3BsYXllci10aXRsZScsIFwiIFwiICsgcGxheWVyW1widGl0bGVcIl0gKyBcIiBcIiksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsYXllcltcIl9pZFwiXSxcclxuICAgICAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICBdKVxyXG4gICAgICAgIF0pXHJcbiAgICAgICAgKTtcclxuICAgIHJldHVybiBbaGVhZGVyLCBoKCd0Ym9keScsIHJvd3MpXTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHBsYXllcnNWaWV3KG1vZGVsKTogVk5vZGVbXSB7XHJcbiAgICByZW5kZXJVc2VybmFtZShtb2RlbFtcImhvbWVcIl0sIG1vZGVsW1widXNlcm5hbWVcIl0pO1xyXG5cclxuICAgIHZhciB4bWxodHRwID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcbiAgICB2YXIgdXJsID0gbW9kZWxbXCJob21lXCJdICsgXCIvYXBpL3BsYXllcnNcIjtcclxuXHJcbiAgICB4bWxodHRwLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09IDQgJiYgdGhpcy5zdGF0dXMgPT0gMjAwKSB7XHJcbiAgICAgICAgdmFyIG15QXJyID0gSlNPTi5wYXJzZSh0aGlzLnJlc3BvbnNlVGV4dCk7XHJcbiAgICAgICAgbXlGdW5jdGlvbihteUFycik7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgICB4bWxodHRwLm9wZW4oXCJHRVRcIiwgdXJsLCB0cnVlKTtcclxuICAgIHhtbGh0dHAuc2VuZCgpO1xyXG5cclxuICAgIGZ1bmN0aW9uIG15RnVuY3Rpb24oYXJyKSB7XHJcbiAgICAgICAgY29uc3Qgb2xkVk5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheWVycycpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGFycik7XHJcbiAgICAgICAgaWYgKG9sZFZOb2RlIGluc3RhbmNlb2YgRWxlbWVudCkge1xyXG4gICAgICAgICAgICBwYXRjaChvbGRWTm9kZSBhcyBIVE1MRWxlbWVudCwgaCgndGFibGUjcGxheWVycycsIHJlbmRlclBsYXllcnMobW9kZWwsIGFycikpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2cobW9kZWwpO1xyXG4gICAgcmV0dXJuIFtoKCdhc2lkZS5zaWRlYmFyLWZpcnN0JyksXHJcbiAgICAgICAgICAgIGgoJ21haW4ubWFpbicsIFtoKCd0YWJsZSNwbGF5ZXJzJyldKSxcclxuICAgICAgICAgICAgaCgnYXNpZGUuc2lkZWJhci1zZWNvbmQnKSxcclxuICAgICAgICBdO1xyXG59XHJcbiIsImltcG9ydCB7IGgsIGluaXQgfSBmcm9tIFwic25hYmJkb21cIjtcbmltcG9ydCBrbGFzcyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL2NsYXNzJztcbmltcG9ydCBhdHRyaWJ1dGVzIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvYXR0cmlidXRlcyc7XG5pbXBvcnQgcHJvcGVydGllcyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL3Byb3BzJztcbmltcG9ydCBsaXN0ZW5lcnMgZnJvbSAnc25hYmJkb20vbW9kdWxlcy9ldmVudGxpc3RlbmVycyc7XG5cbmltcG9ydCAqIGFzIGNnIGZyb20gJ2NoZXNzZ3JvdW5keC90eXBlcyc7XG5pbXBvcnQgeyBkcmFnTmV3UGllY2UgfSBmcm9tICdjaGVzc2dyb3VuZHgvZHJhZyc7XG5pbXBvcnQgeyBDb2xvciB9IGZyb20gJ2NoZXNzZ3JvdW5keC90eXBlcyc7XG4vL2ltcG9ydCB7IHNldERyb3BNb2RlLCBjYW5jZWxEcm9wTW9kZSB9IGZyb20gJ2NoZXNzZ3JvdW5keC9kcm9wJztcblxuaW1wb3J0IHsgcm9sZVRvU2FuLCBuZWVkUG9ja2V0cywgcG9ja2V0Um9sZXMsIGxjIH0gZnJvbSAnLi9jaGVzcyc7XG5pbXBvcnQgUm91bmRDb250cm9sbGVyIGZyb20gJy4vcm91bmRDdHJsJztcbmltcG9ydCBBbmFseXNpc0NvbnRyb2xsZXIgZnJvbSAnLi9hbmFseXNpc0N0cmwnO1xuXG5jb25zdCBwYXRjaCA9IGluaXQoW2tsYXNzLCBhdHRyaWJ1dGVzLCBwcm9wZXJ0aWVzLCBsaXN0ZW5lcnNdKTtcblxudHlwZSBQb3NpdGlvbiA9ICd0b3AnIHwgJ2JvdHRvbSc7XG5cbmNvbnN0IGV2ZW50TmFtZXMgPSBbJ21vdXNlZG93bicsICd0b3VjaHN0YXJ0J107XG5cbmV4cG9ydCBmdW5jdGlvbiBwb2NrZXRWaWV3KGN0cmw6IFJvdW5kQ29udHJvbGxlciB8IEFuYWx5c2lzQ29udHJvbGxlciwgY29sb3I6IENvbG9yLCBwb3NpdGlvbjogUG9zaXRpb24pIHtcbiAgY29uc3QgcG9ja2V0ID0gY3RybC5wb2NrZXRzW3Bvc2l0aW9uID09PSAndG9wJyA/IDAgOiAxXTtcbiAgY29uc3QgcGllY2VSb2xlcyA9IE9iamVjdC5rZXlzKHBvY2tldCk7XG4gIHJldHVybiBoKCdkaXYucG9ja2V0LicgKyBwb3NpdGlvbiwge1xuICAgIGNsYXNzOiB7IHVzYWJsZTogdHJ1ZSB9LFxuICAgIGhvb2s6IHtcbiAgICAgIGluc2VydDogdm5vZGUgPT4ge1xuICAgICAgICBldmVudE5hbWVzLmZvckVhY2gobmFtZSA9PiB7XG4gICAgICAgICAgKHZub2RlLmVsbSBhcyBIVE1MRWxlbWVudCkuYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCAoZTogY2cuTW91Y2hFdmVudCkgPT4ge1xuICAgICAgICAgICAgaWYgKHBvc2l0aW9uID09PSAoY3RybC5mbGlwID8gJ3RvcCcgOiAnYm90dG9tJykpIGRyYWcoY3RybCwgZSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9LCBwaWVjZVJvbGVzLm1hcChyb2xlID0+IHtcbiAgICBsZXQgbmIgPSBwb2NrZXRbcm9sZV0gfHwgMDtcbiAgICByZXR1cm4gaCgncGllY2UuJyArIHJvbGUgKyAnLicgKyBjb2xvciwge1xuICAgICAgYXR0cnM6IHtcbiAgICAgICAgJ2RhdGEtcm9sZSc6IHJvbGUsXG4gICAgICAgICdkYXRhLWNvbG9yJzogY29sb3IsXG4gICAgICAgICdkYXRhLW5iJzogbmIsXG4gICAgICB9XG4gICAgfSk7XG4gIH0pKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRyYWcoY3RybDogUm91bmRDb250cm9sbGVyIHwgQW5hbHlzaXNDb250cm9sbGVyLCBlOiBjZy5Nb3VjaEV2ZW50KTogdm9pZCB7XG4gICAgaWYgKGUuYnV0dG9uICE9PSB1bmRlZmluZWQgJiYgZS5idXR0b24gIT09IDApIHJldHVybjsgLy8gb25seSB0b3VjaCBvciBsZWZ0IGNsaWNrXG4gICAgY29uc3QgZWwgPSBlLnRhcmdldCBhcyBIVE1MRWxlbWVudCxcbiAgICByb2xlID0gZWwuZ2V0QXR0cmlidXRlKCdkYXRhLXJvbGUnKSBhcyBjZy5Sb2xlLFxuICAgIGNvbG9yID0gZWwuZ2V0QXR0cmlidXRlKCdkYXRhLWNvbG9yJykgYXMgY2cuQ29sb3IsXG4gICAgbnVtYmVyID0gZWwuZ2V0QXR0cmlidXRlKCdkYXRhLW5iJyk7XG4gICAgaWYgKCFyb2xlIHx8ICFjb2xvciB8fCBudW1iZXIgPT09ICcwJykgcmV0dXJuO1xuICAgIGlmIChjdHJsLmNsaWNrRHJvcCAhPT0gdW5kZWZpbmVkICYmIHJvbGUgPT09IGN0cmwuY2xpY2tEcm9wLnJvbGUpIHtcbiAgICAgICAgY3RybC5jbGlja0Ryb3AgPSB1bmRlZmluZWQ7XG4gICAgICAgIGN0cmwuY2hlc3Nncm91bmQuc2VsZWN0U3F1YXJlKG51bGwpO1xuICAgICAgICAvL2NhbmNlbERyb3BNb2RlKGN0cmwuY2hlc3Nncm91bmQuc3RhdGUpO1xuICAgICAgICByZXR1cm47XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy9zZXREcm9wTW9kZShjdHJsLmNoZXNzZ3JvdW5kLnN0YXRlLCBudW1iZXIgIT09ICcwJyA/IHsgY29sb3IsIHJvbGUgfSA6IHVuZGVmaW5lZCk7XG4gICAgfTtcblxuICAgIC8vIFNob3cgcG9zc2libGUgZHJvcCBkZXN0cyBvbiBteSB0dXJuIG9ubHkgbm90IHRvIG1lc3MgdXAgcHJlZHJvcFxuICAgIGlmIChjdHJsLnR1cm5Db2xvciA9PT0gY3RybC5teWNvbG9yKSB7XG4gICAgICAgIGNvbnN0IGRyb3BEZXN0cyA9IHsgJ3owJzogY3RybC5kZXN0c1tyb2xlVG9TYW5bcm9sZV0gKyBcIkBcIl0gfTtcbiAgICAgICAgY29uc29sZS5sb2coXCIgICAgIG5ldyBwaWVjZSB0byB6MFwiLCByb2xlKTtcbiAgICAgICAgY3RybC5jaGVzc2dyb3VuZC5uZXdQaWVjZSh7XCJyb2xlXCI6IHJvbGUsIFwiY29sb3JcIjogY29sb3J9LCAnejAnKVxuICAgICAgICBjdHJsLmNoZXNzZ3JvdW5kLnNldCh7XG4gICAgICAgICAgICB0dXJuQ29sb3I6IGNvbG9yLFxuICAgICAgICAgICAgbW92YWJsZToge1xuICAgICAgICAgICAgICAgIGRlc3RzOiBkcm9wRGVzdHMsXG4gICAgICAgICAgICAgICAgc2hvd0Rlc3RzOiB0cnVlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIGN0cmwuY2hlc3Nncm91bmQuc2VsZWN0U3F1YXJlKCd6MCcpO1xuICAgICAgICBjdHJsLmNoZXNzZ3JvdW5kLnNldCh7IGxhc3RNb3ZlOiBjdHJsLmxhc3Rtb3ZlIH0pO1xuICAgIH1cbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBkcmFnTmV3UGllY2UoY3RybC5jaGVzc2dyb3VuZC5zdGF0ZSwgeyBjb2xvciwgcm9sZSB9LCBlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRyb3BJc1ZhbGlkKGRlc3RzOiBjZy5EZXN0cywgcm9sZTogY2cuUm9sZSwga2V5OiBjZy5LZXkpOiBib29sZWFuIHtcbiAgICBjb25zdCBkcm9wcyA9IGRlc3RzW3JvbGVUb1Nhbltyb2xlXSArIFwiQFwiXTtcbiAgICAvLyBjb25zb2xlLmxvZyhcImRyb3BzOlwiLCBkcm9wcylcblxuICAgIGlmIChkcm9wcyA9PT0gdW5kZWZpbmVkIHx8IGRyb3BzID09PSBudWxsKSByZXR1cm4gZmFsc2U7XG5cbiAgICByZXR1cm4gZHJvcHMuaW5kZXhPZihrZXkpICE9PSAtMTtcbn1cblxuLy8gVE9ETzogYWZ0ZXIgMSBtb3ZlIG1hZGUgb25seSAxIHBvY2tldCB1cGRhdGUgbmVlZGVkIGF0IG9uY2UsIG5vIG5lZWQgdG8gdXBkYXRlIGJvdGhcbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVQb2NrZXRzKGN0cmw6IFJvdW5kQ29udHJvbGxlciB8IEFuYWx5c2lzQ29udHJvbGxlciwgdnBvY2tldDAsIHZwb2NrZXQxKTogdm9pZCB7XG4gICAgLy8gdXBkYXRlIHBvY2tldHMgZnJvbSBmZW5cbiAgICBpZiAobmVlZFBvY2tldHMoY3RybC52YXJpYW50KSkge1xuICAgICAgICBjb25zdCBwYXJ0cyA9IGN0cmwuZnVsbGZlbi5zcGxpdChcIiBcIik7XG4gICAgICAgIGNvbnN0IGZlbl9wbGFjZW1lbnQgPSBwYXJ0c1swXTtcbiAgICAgICAgdmFyIHBvY2tldHMgPSBcIlwiO1xuICAgICAgICBjb25zdCBicmFja2V0UG9zID0gZmVuX3BsYWNlbWVudC5pbmRleE9mKFwiW1wiKTtcbiAgICAgICAgaWYgKGJyYWNrZXRQb3MgIT09IC0xKSB7XG4gICAgICAgICAgICBwb2NrZXRzID0gZmVuX3BsYWNlbWVudC5zbGljZShicmFja2V0UG9zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGMgPSBjdHJsLm15Y29sb3JbMF07XG4gICAgICAgIGNvbnN0IG8gPSBjdHJsLm9wcGNvbG9yWzBdO1xuICAgICAgICBjb25zdCByb2xlcyA9IHBvY2tldFJvbGVzKGN0cmwudmFyaWFudCk7XG4gICAgICAgIHZhciBwbyA9IHt9O1xuICAgICAgICB2YXIgcGMgPSB7fTtcbiAgICAgICAgcm9sZXMuZm9yRWFjaChyb2xlID0+IHBjW3JvbGVdID0gbGMocG9ja2V0cywgcm9sZVRvU2FuW3JvbGVdLnRvTG93ZXJDYXNlKCksIGM9PT0oY3RybC52YXJpYW50PT09J3Nob2dpJyA/ICdiJyA6ICd3JykpKTtcbiAgICAgICAgcm9sZXMuZm9yRWFjaChyb2xlID0+IHBvW3JvbGVdID0gbGMocG9ja2V0cywgcm9sZVRvU2FuW3JvbGVdLnRvTG93ZXJDYXNlKCksIG89PT0oY3RybC52YXJpYW50PT09J3Nob2dpJyA/ICdiJyA6ICd3JykpKTtcbiAgICAgICAgaWYgKGN0cmwuZmxpcCkge1xuICAgICAgICAgICAgY3RybC5wb2NrZXRzID0gW3BjLCBwb107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjdHJsLnBvY2tldHMgPSBbcG8sIHBjXTtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZyhvLGMscG8scGMpXG4gICAgICAgIGN0cmwudnBvY2tldDAgPSBwYXRjaCh2cG9ja2V0MCwgcG9ja2V0VmlldyhjdHJsLCBjdHJsLmZsaXAgPyBjdHJsLm15Y29sb3IgOiBjdHJsLm9wcGNvbG9yLCBcInRvcFwiKSk7XG4gICAgICAgIGN0cmwudnBvY2tldDEgPSBwYXRjaCh2cG9ja2V0MSwgcG9ja2V0VmlldyhjdHJsLCBjdHJsLmZsaXAgPyBjdHJsLm9wcGNvbG9yIDogY3RybC5teWNvbG9yLCBcImJvdHRvbVwiKSk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgaW5pdCB9IGZyb20gJ3NuYWJiZG9tJztcclxuaW1wb3J0IGtsYXNzIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvY2xhc3MnO1xyXG5pbXBvcnQgYXR0cmlidXRlcyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL2F0dHJpYnV0ZXMnO1xyXG5pbXBvcnQgcHJvcGVydGllcyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL3Byb3BzJztcclxuaW1wb3J0IGxpc3RlbmVycyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL2V2ZW50bGlzdGVuZXJzJztcclxuXHJcbmNvbnN0IHBhdGNoID0gaW5pdChba2xhc3MsIGF0dHJpYnV0ZXMsIHByb3BlcnRpZXMsIGxpc3RlbmVyc10pO1xyXG5cclxuaW1wb3J0IGggZnJvbSAnc25hYmJkb20vaCc7XHJcbmltcG9ydCB7IFZOb2RlIH0gZnJvbSAnc25hYmJkb20vdm5vZGUnO1xyXG5cclxuaW1wb3J0IHsgQ2hlc3Nncm91bmQgfSBmcm9tICdjaGVzc2dyb3VuZHgnO1xyXG5cclxuaW1wb3J0IHsgcmVuZGVyVXNlcm5hbWUgfSBmcm9tICcuL3VzZXInO1xyXG5pbXBvcnQgeyB2YXJpYW50cywgVkFSSUFOVFMgfSBmcm9tICcuL2NoZXNzJztcclxuaW1wb3J0IHsgcmVuZGVyVGltZWFnbyB9IGZyb20gJy4vY2xvY2snO1xyXG5pbXBvcnQgeyBjaGFuZ2VDU1MgfSBmcm9tICcuL3NldHRpbmdzJztcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVzdWx0KHN0YXR1cywgcmVzdWx0KSB7XHJcbiAgICB2YXIgdGV4dCA9ICcnO1xyXG4gICAgY29uc29sZS5sb2coXCJyZXN1bHQoKVwiLCBzdGF0dXMsIHJlc3VsdCk7XHJcbiAgICBzd2l0Y2ggKHN0YXR1cykge1xyXG4gICAgY2FzZSAtMjpcclxuICAgIGNhc2UgLTE6XHJcbiAgICAgICAgdGV4dCA9ICdQbGF5aW5nIHJpZ2h0IG5vdyc7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICBjYXNlIDA6XHJcbiAgICAgICAgdGV4dCA9ICdHYW1lIGFib3J0ZWQnO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAxOlxyXG4gICAgICAgIHRleHQgPSAnQ2hlY2ttYXRlJztcclxuICAgICAgICBicmVhaztcclxuICAgIGNhc2UgMjpcclxuICAgICAgICB0ZXh0ID0gKChyZXN1bHQgPT09ICcxLTAnKSA/ICdCbGFjaycgOiAnV2hpdGUnKSArICcgcmVzaWduZWQnO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAzOlxyXG4gICAgICAgIHRleHQgPSAnU3RhbGVtYXRlJztcclxuICAgICAgICBicmVhaztcclxuICAgIGNhc2UgNDpcclxuICAgICAgICB0ZXh0ID0gJ1RpbWUgb3V0JztcclxuICAgICAgICBicmVhaztcclxuICAgIGNhc2UgNTpcclxuICAgICAgICB0ZXh0ID0gJ0RyYXcnO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSA2OlxyXG4gICAgICAgIHRleHQgPSAnVGltZSBvdXQnO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSA3OlxyXG4gICAgICAgIHRleHQgPSAoKHJlc3VsdCA9PT0gJzEtMCcpID8gJ0JsYWNrJyA6ICdXaGl0ZScpICsgJyBhYmFuZG9uZWQgdGhlIGdhbWUnO1xyXG4gICAgICAgIGJyZWFrXHJcbiAgICBkZWZhdWx0OlxyXG4gICAgICAgIHRleHQgPSAnKic7XHJcbiAgICAgICAgYnJlYWtcclxuICAgIH1cclxuICAgIHJldHVybiAoc3RhdHVzIDw9IDApID8gdGV4dCA6IHRleHQgKyAnLCAnICsgcmVzdWx0O1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gcmVuZGVyR2FtZXMobW9kZWwsIGdhbWVzKSB7XHJcbi8vICAgICAgICAgICAgICAgIGgoJ2ZuJywgcGxheWVyW1wiZmlyc3RfbmFtZVwiXSksXHJcbi8vICAgICAgICAgICAgICAgIGgoJ2xuJywgcGxheWVyW1wibGFzdF9uYW1lXCJdKSxcclxuLy8gICAgICAgICAgICAgICAgaCgnY291bnRyeScsIHBsYXllcltcImNvdW50cnlcIl0pLFxyXG4gICAgdmFyIHJvd3MgPSBnYW1lcy5tYXAoKGdhbWUpID0+IGgoXHJcbiAgICAgICAgJ3RyJyxcclxuICAgICAgICB7IG9uOiB7IGNsaWNrOiAoKSA9PiB7IHdpbmRvdy5sb2NhdGlvbi5hc3NpZ24obW9kZWxbXCJob21lXCJdICsgJy8nICsgZ2FtZVtcIl9pZFwiXSk7IH0gfSxcclxuICAgICAgICB9LCBbXHJcbiAgICAgICAgaCgndGQuYm9hcmQnLCBbXHJcbiAgICAgICAgICAgIGgoJ3NlbGVjdGlvbi4nICsgVkFSSUFOVFNbZ2FtZVtcInZcIl1dLmJvYXJkICsgJy4nICsgVkFSSUFOVFNbZ2FtZVtcInZcIl1dLnBpZWNlcywgW1xyXG4gICAgICAgICAgICAgICAgaCgnZGl2LmNnLXdyYXAuJyArIFZBUklBTlRTW2dhbWVbXCJ2XCJdXS5jZyArICcubWluaScsIHsgaG9vazoge1xyXG4gICAgICAgICAgICAgICAgICAgIGluc2VydDogKHZub2RlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIENoZXNzZ3JvdW5kKHZub2RlLmVsbSBhcyBIVE1MRWxlbWVudCwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29vcmRpbmF0ZXM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlld09ubHk6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmZW46IGdhbWVbXCJmXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2VvbWV0cnk6IFZBUklBTlRTW2dhbWVbXCJ2XCJdXS5nZW9tXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH19KSxcclxuICAgICAgICAgICAgXSksXHJcbiAgICAgICAgXSksXHJcbiAgICAgICAgaCgndGQuZ2FtZXMtaW5mbycsIFtcclxuICAgICAgICAgICAgaCgnZGl2LmluZm8wJywge2F0dHJzOiB7XCJkYXRhLWljb25cIjogVkFSSUFOVFNbZ2FtZVtcInZcIl1dLmljb259LCBjbGFzczoge1wiaWNvblwiOiB0cnVlfX0sIFtcclxuICAgICAgICAgICAgICAgIGgoJ2Rpdi5pbmZvMScsIHthdHRyczoge1wiZGF0YS1pY29uXCI6IChnYW1lW1wielwiXSA9PT0gMSkgPyBcIlZcIiA6IFwiXCJ9LCBjbGFzczoge1wiaWNvblwiOiB0cnVlfX0pLFxyXG4gICAgICAgICAgICAgICAgaCgnZGl2LmluZm8yJywgW1xyXG4gICAgICAgICAgICAgICAgICAgIGgoJ2Rpdi50YycsIGdhbWVbXCJiXCJdICsgXCIrXCIgKyBnYW1lW1wiaVwiXSArIFwiIOKAoiBDYXN1YWwg4oCiIFwiICsgZ2FtZVtcInZcIl0pLFxyXG4gICAgICAgICAgICAgICAgICAgIGgoJ2luZm8tZGF0ZScsIHthdHRyczoge3RpbWVzdGFtcDogZ2FtZVtcImRcIl19fSksXHJcbiAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgIGgoJ2RpdicsIFtcclxuICAgICAgICAgICAgICAgIGgoJ3BsYXllcicsIFtcclxuICAgICAgICAgICAgICAgICAgICBoKCdhLnVzZXItbGluaycsIHthdHRyczoge2hyZWY6ICcvQC8nICsgZ2FtZVtcInVzXCJdWzBdfX0sIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaCgncGxheWVyLXRpdGxlJywgXCIgXCIgKyBnYW1lW1wid3RcIl0gKyBcIiBcIiksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdhbWVbXCJ1c1wiXVswXSArICgoZ2FtZVtcInd0XCJdID09PSAnQk9UJyAmJiBnYW1lWyd4J10gPiAwKSA/ICcgbGV2ZWwgJyArIGdhbWVbJ3gnXTogJycpLFxyXG4gICAgICAgICAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgICAgICBoKCd2cycsICcgLSAnKSxcclxuICAgICAgICAgICAgICAgIGgoJ3BsYXllcicsIFtcclxuICAgICAgICAgICAgICAgICAgICBoKCdhLnVzZXItbGluaycsIHthdHRyczoge2hyZWY6ICcvQC8nICsgZ2FtZVtcInVzXCJdWzFdfX0sIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaCgncGxheWVyLXRpdGxlJywgXCIgXCIgKyBnYW1lW1wiYnRcIl0gKyBcIiBcIiksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdhbWVbXCJ1c1wiXVsxXSArICgoZ2FtZVtcImJ0XCJdID09PSAnQk9UJyAmJiBnYW1lWyd4J10gPiAwKSA/ICcgbGV2ZWwgJyArIGdhbWVbJ3gnXTogJycpLFxyXG4gICAgICAgICAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICBoKCdkaXYuaW5mby1yZXN1bHQnLCB7XHJcbiAgICAgICAgICAgICAgICBjbGFzczoge1xyXG4gICAgICAgICAgICAgICAgICAgIFwid2luXCI6IChnYW1lW1wiclwiXSA9PT0gJzEtMCcgJiYgZ2FtZVtcInVzXCJdWzBdID09PSBtb2RlbFtcInByb2ZpbGVpZFwiXSkgfHwgKGdhbWVbXCJyXCJdID09PSAnMC0xJyAmJiBnYW1lW1widXNcIl1bMV0gPT09IG1vZGVsW1wicHJvZmlsZWlkXCJdKSxcclxuICAgICAgICAgICAgICAgICAgICBcImxvc2VcIjogKGdhbWVbXCJyXCJdID09PSAnMC0xJyAmJiBnYW1lW1widXNcIl1bMF0gPT09IG1vZGVsW1wicHJvZmlsZWlkXCJdKSB8fCAoZ2FtZVtcInJcIl0gPT09ICcxLTAnICYmIGdhbWVbXCJ1c1wiXVsxXSA9PT0gbW9kZWxbXCJwcm9maWxlaWRcIl0pLFxyXG4gICAgICAgICAgICAgICAgfX0sIHJlc3VsdChnYW1lW1wic1wiXSwgZ2FtZVtcInJcIl0pXHJcbiAgICAgICAgICAgICksXHJcbiAgICAgICAgXSlcclxuICAgICAgICBdKVxyXG4gICAgICAgICk7XHJcbiAgICByZXR1cm4gW2goJ3Rib2R5Jywgcm93cyldO1xyXG59XHJcblxyXG5mdW5jdGlvbiBsb2FkR2FtZXMobW9kZWwsIHBhZ2UpIHtcclxuICAgIHZhciB4bWxodHRwID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcbiAgICB2YXIgdXJsID0gbW9kZWxbXCJob21lXCJdICsgXCIvYXBpL1wiICsgbW9kZWxbXCJwcm9maWxlaWRcIl0gKyBcIi9nYW1lcz9wPVwiO1xyXG5cclxuICAgIHhtbGh0dHAub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgaWYgKHRoaXMucmVhZHlTdGF0ZSA9PSA0ICYmIHRoaXMuc3RhdHVzID09IDIwMCkge1xyXG4gICAgICAgICAgICB2YXIgbXlBcnIgPSBKU09OLnBhcnNlKHRoaXMucmVzcG9uc2VUZXh0KTtcclxuXHJcbiAgICAgICAgICAgIC8vIElmIGVtcHR5IEpTT04sIGV4aXQgdGhlIGZ1bmN0aW9uXHJcbiAgICAgICAgICAgIGlmICghbXlBcnIubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbXlGdW5jdGlvbihteUFycik7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIHhtbGh0dHAub3BlbihcIkdFVFwiLCB1cmwgKyBwYWdlLCB0cnVlKTtcclxuICAgIHhtbGh0dHAuc2VuZCgpO1xyXG5cclxuICAgIGZ1bmN0aW9uIG15RnVuY3Rpb24oYXJyKSB7XHJcbiAgICAgICAgY29uc3Qgb2xkVk5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2FtZXMnKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhhcnIpO1xyXG4gICAgICAgIGlmIChvbGRWTm9kZSBpbnN0YW5jZW9mIEVsZW1lbnQpIHtcclxuICAgICAgICAgICAgcGF0Y2gob2xkVk5vZGUgYXMgSFRNTEVsZW1lbnQsIGgoJ3RhYmxlI2dhbWVzJywgcmVuZGVyR2FtZXMobW9kZWwsIGFycikpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmVuZGVyVGltZWFnbygpO1xyXG4gICAgfVxyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gb2JzZXJ2ZVNlbnRpbmVsKHZub2RlOiBWTm9kZSwgbW9kZWwpIHtcclxuICAgIGNvbnN0IHNlbnRpbmVsID0gdm5vZGUuZWxtIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgdmFyIHBhZ2UgPSAwO1xyXG5cclxuICAgIHZhciBpbnRlcnNlY3Rpb25PYnNlcnZlciA9IG5ldyBJbnRlcnNlY3Rpb25PYnNlcnZlcihlbnRyaWVzID0+IHtcclxuICAgICAgICAvLyBJZiBpbnRlcnNlY3Rpb25SYXRpbyBpcyAwLCB0aGUgc2VudGluZWwgaXMgb3V0IG9mIHZpZXdcclxuICAgICAgICAvLyBhbmQgd2UgZG9uJ3QgbmVlZCB0byBkbyBhbnl0aGluZy4gRXhpdCB0aGUgZnVuY3Rpb25cclxuICAgICAgICBpZiAoZW50cmllc1swXS5pbnRlcnNlY3Rpb25SYXRpbyA8PSAwKSByZXR1cm47XHJcblxyXG4gICAgICAgIGxvYWRHYW1lcyhtb2RlbCwgcGFnZSk7XHJcbiAgICAgICAgcGFnZSArPSAxO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaW50ZXJzZWN0aW9uT2JzZXJ2ZXIub2JzZXJ2ZShzZW50aW5lbCEpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcHJvZmlsZVZpZXcobW9kZWwpOiBWTm9kZVtdIHtcclxuICAgIHJlbmRlclVzZXJuYW1lKG1vZGVsW1wiaG9tZVwiXSwgbW9kZWxbXCJ1c2VybmFtZVwiXSk7XHJcbiAgICBjb25zb2xlLmxvZyhtb2RlbCk7XHJcblxyXG4gICAgY29uc3QgQ1NTaW5kZXhlc0IgPSB2YXJpYW50cy5tYXAoKHZhcmlhbnQpID0+IGxvY2FsU3RvcmFnZVt2YXJpYW50ICsgXCJfYm9hcmRcIl0gPT09IHVuZGVmaW5lZCA/IDAgOiBOdW1iZXIobG9jYWxTdG9yYWdlW3ZhcmlhbnQgKyBcIl9ib2FyZFwiXSkpO1xyXG4gICAgY29uc3QgQ1NTaW5kZXhlc1AgPSB2YXJpYW50cy5tYXAoKHZhcmlhbnQpID0+IGxvY2FsU3RvcmFnZVt2YXJpYW50ICsgXCJfcGllY2VzXCJdID09PSB1bmRlZmluZWQgPyAwIDogTnVtYmVyKGxvY2FsU3RvcmFnZVt2YXJpYW50ICsgXCJfcGllY2VzXCJdKSk7XHJcbiAgICBPYmplY3Qua2V5cyhWQVJJQU5UUykuZm9yRWFjaCgoa2V5KSA9PiB7XHJcbiAgICAgICAgY29uc3QgdmFyaWFudCA9IFZBUklBTlRTW2tleV07XHJcbiAgICAgICAgaWYgKHZhcmlhbnQuQm9hcmRDU1MubGVuZ3RoID4gMSkge1xyXG4gICAgICAgICAgICB2YXIgaWR4ID0gQ1NTaW5kZXhlc0JbdmFyaWFudHMuaW5kZXhPZihrZXkpXTtcclxuICAgICAgICAgICAgaWR4ID0gTWF0aC5taW4oaWR4LCB2YXJpYW50LkJvYXJkQ1NTLmxlbmd0aCAtIDEpO1xyXG4gICAgICAgICAgICBjaGFuZ2VDU1MoJy9zdGF0aWMvJyArIHZhcmlhbnQuQm9hcmRDU1NbaWR4XSArICcuY3NzJyk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBpZiAodmFyaWFudC5QaWVjZUNTUy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgICAgIHZhciBpZHggPSBDU1NpbmRleGVzUFt2YXJpYW50cy5pbmRleE9mKGtleSldO1xyXG4gICAgICAgICAgICBpZHggPSBNYXRoLm1pbihpZHgsIHZhcmlhbnQuUGllY2VDU1MubGVuZ3RoIC0gMSk7XHJcbiAgICAgICAgICAgIGNoYW5nZUNTUygnL3N0YXRpYy8nICsgdmFyaWFudC5QaWVjZUNTU1tpZHhdICsgJy5jc3MnKTtcclxuICAgICAgICB9O1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIFtoKCdhc2lkZS5zaWRlYmFyLWZpcnN0JyksXHJcbiAgICAgICAgICAgIGgoJ21haW4ubWFpbicsIFtcclxuICAgICAgICAgICAgICAgIGgoJ3BsYXllci1oZWFkJywgW1xyXG4gICAgICAgICAgICAgICAgICAgIG1vZGVsW1wicHJvZmlsZWlkXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgIGgoJ2EuaS1kbCcsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXR0cnM6IHtocmVmOiAnL2dhbWVzL2V4cG9ydC8nICsgbW9kZWxbXCJwcm9maWxlaWRcIl0sIFwiZG93bmxvYWRcIjogbW9kZWxbXCJwcm9maWxlaWRcIl0gKyAnLnBnbid9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczoge1wiaWNvblwiOiB0cnVlLCBcImljb24tZG93bmxvYWRcIjogdHJ1ZX19KSxcclxuICAgICAgICAgICAgICAgICAgICBoKCdhLmktdHYnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJzOiB7aHJlZjogJy9ALycgKyBtb2RlbFtcInByb2ZpbGVpZFwiXSArICcvdHYnfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6IHtcImljb25cIjogdHJ1ZSwgXCJpY29uLXR2XCI6IHRydWV9fSksXHJcbiAgICAgICAgICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgICAgICBoKCd0YWJsZSNnYW1lcycpLFxyXG4gICAgICAgICAgICAgICAgaCgnZGl2I3NlbnRpbmVsJywgeyBob29rOiB7IGluc2VydDogKHZub2RlKSA9PiBvYnNlcnZlU2VudGluZWwodm5vZGUsIG1vZGVsKSB9fSlcclxuICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgIGgoJ2FzaWRlLnNpZGViYXItc2Vjb25kJyksXHJcbiAgICAgICAgXTtcclxufVxyXG4iLCJpbXBvcnQgeyBoLCBpbml0IH0gZnJvbSBcInNuYWJiZG9tXCI7XHJcbmltcG9ydCBrbGFzcyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL2NsYXNzJztcclxuaW1wb3J0IGF0dHJpYnV0ZXMgZnJvbSAnc25hYmJkb20vbW9kdWxlcy9hdHRyaWJ1dGVzJztcclxuaW1wb3J0IGxpc3RlbmVycyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL2V2ZW50bGlzdGVuZXJzJztcclxuaW1wb3J0IHRvVk5vZGUgZnJvbSAnc25hYmJkb20vdG92bm9kZSc7XHJcblxyXG5pbXBvcnQgeyBrZXkycG9zIH0gZnJvbSAnY2hlc3Nncm91bmR4L3V0aWwnO1xyXG5cclxuaW1wb3J0IHsgaXNQcm9tb3Rpb24sIG1hbmRhdG9yeVByb21vdGlvbiwgcHJvbW90aW9uUm9sZXMsIHJvbGVUb1NhbiB9IGZyb20gJy4vY2hlc3MnO1xyXG5cclxuY29uc3QgcGF0Y2ggPSBpbml0KFtrbGFzcywgYXR0cmlidXRlcywgbGlzdGVuZXJzXSk7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihjdHJsKSB7XHJcblxyXG4gICAgbGV0IHByb21vdGluZzogYW55ID0gZmFsc2U7XHJcbiAgICBsZXQgcm9sZXM6IHN0cmluZ1tdID0gW107XHJcblxyXG4gICAgZnVuY3Rpb24gc3RhcnQob3JpZywgZGVzdCwgbWV0YSkge1xyXG4gICAgICAgIGNvbnN0IGdyb3VuZCA9IGN0cmwuZ2V0R3JvdW5kKCk7XHJcbiAgICAgICAgaWYgKGlzUHJvbW90aW9uKGN0cmwudmFyaWFudCwgZ3JvdW5kLnN0YXRlLnBpZWNlc1tkZXN0XSwgb3JpZywgZGVzdCwgbWV0YSwgY3RybC5wcm9tb3Rpb25zKSkge1xyXG4gICAgICAgICAgICBjb25zdCBjb2xvciA9IGN0cmwubXljb2xvcjtcclxuICAgICAgICAgICAgY29uc3Qgb3JpZW50YXRpb24gPSBncm91bmQuc3RhdGUub3JpZW50YXRpb247XHJcbiAgICAgICAgICAgIGNvbnN0IG1vdmluZ1JvbGUgPSBncm91bmQuc3RhdGUucGllY2VzW2Rlc3RdLnJvbGU7XHJcbiAgICAgICAgICAgIHJvbGVzID0gcHJvbW90aW9uUm9sZXMoY3RybC52YXJpYW50LCBtb3ZpbmdSb2xlLCBvcmlnLCBkZXN0LCBjdHJsLnByb21vdGlvbnMpO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoIChjdHJsLnZhcmlhbnQpIHtcclxuICAgICAgICAgICAgLy8gVE9ETzogaW4gZ3JhbmQgY2hlc3MgdXNlIG1hbmRhdG9yeVByb21vdGlvbiB3aGVuIHByb21vdGlvbiBoYXBwZW5zIG9uIGJhY2sgcmFua1xyXG4gICAgICAgICAgICBjYXNlIFwic2hvZ2lcIjpcclxuICAgICAgICAgICAgICAgIGlmIChtYW5kYXRvcnlQcm9tb3Rpb24obW92aW5nUm9sZSwgZGVzdCwgY29sb3IpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcHJvbW90ZShncm91bmQsIGRlc3QsICdwJyArIGdyb3VuZC5zdGF0ZS5waWVjZXNbZGVzdF0ucm9sZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY3RybC5zZW5kTW92ZShvcmlnLCBkZXN0LCAnKycpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBkcmF3X3Byb21vKGRlc3QsIGNvbG9yLCBvcmllbnRhdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgcHJvbW90aW5nID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvcmlnOiBvcmlnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXN0OiBkZXN0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogY3RybC5zZW5kTW92ZSxcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdtYWtydWsnOlxyXG4gICAgICAgICAgICAgICAgcHJvbW90ZShncm91bmQsIGRlc3QsICdtZXQnKTtcclxuICAgICAgICAgICAgICAgIGN0cmwuc2VuZE1vdmUob3JpZywgZGVzdCwgJ20nKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdzaXR0dXlpbic6XHJcbiAgICAgICAgICAgICAgICBwcm9tb3RlKGdyb3VuZCwgZGVzdCwgJ2ZlcnonKTtcclxuICAgICAgICAgICAgICAgIGN0cmwuc2VuZE1vdmUob3JpZywgZGVzdCwgJ2YnKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgLy8gaW4gZ3JhbmQgY2hlc3MgcHJvbW90aW9uIG9uIGJhY2sgcmFuayBpcyBtYW5kYXRvcnlcclxuICAgICAgICAgICAgICAgIC8vIGFuZCBzb21ldGltZXMgb25seSBvbmUgY2hvaWNlIGV4aXN0c1xyXG4gICAgICAgICAgICAgICAgaWYgKHJvbGVzLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJvbGUgPSByb2xlc1swXTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9tbyA9IHJvbGVUb1Nhbltyb2xlXS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHByb21vdGUoZ3JvdW5kLCBkZXN0LCByb2xlKTtcclxuICAgICAgICAgICAgICAgICAgICBjdHJsLnNlbmRNb3ZlKG9yaWcsIGRlc3QsIHByb21vKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZHJhd19wcm9tbyhkZXN0LCBjb2xvciwgb3JpZW50YXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIHByb21vdGluZyA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3JpZzogb3JpZyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzdDogZGVzdCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IGN0cmwuc2VuZE1vdmUsXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9O1xyXG5cclxuICAgIGZ1bmN0aW9uIHByb21vdGUoZywga2V5LCByb2xlKSB7XHJcbiAgICAgICAgdmFyIHBpZWNlcyA9IHt9O1xyXG4gICAgICAgIHZhciBwaWVjZSA9IGcuc3RhdGUucGllY2VzW2tleV07XHJcbiAgICAgICAgaWYgKGcuc3RhdGUucGllY2VzW2tleV0ucm9sZSA9PT0gcm9sZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcGllY2VzW2tleV0gPSB7XHJcbiAgICAgICAgICAgICAgICBjb2xvcjogcGllY2UuY29sb3IsXHJcbiAgICAgICAgICAgICAgICByb2xlOiByb2xlLFxyXG4gICAgICAgICAgICAgICAgcHJvbW90ZWQ6IHRydWVcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgZy5zZXRQaWVjZXMocGllY2VzKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRyYXdfcHJvbW8oZGVzdCwgY29sb3IsIG9yaWVudGF0aW9uKSB7XHJcbiAgICAgICAgdmFyIGNvbnRhaW5lciA9IHRvVk5vZGUoZG9jdW1lbnQucXVlcnlTZWxlY3RvcignZXh0ZW5zaW9uJykgYXMgTm9kZSk7XHJcbiAgICAgICAgcGF0Y2goY29udGFpbmVyLCByZW5kZXJQcm9tb3Rpb24oZGVzdCwgY29sb3IsIG9yaWVudGF0aW9uKSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZHJhd19ub19wcm9tbygpIHtcclxuICAgICAgICB2YXIgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2V4dGVuc2lvbl9jaG9pY2UnKSBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICBwYXRjaChjb250YWluZXIsIGgoJ2V4dGVuc2lvbicpKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBmaW5pc2gocm9sZSkge1xyXG4gICAgICAgIGlmIChwcm9tb3RpbmcpIHtcclxuICAgICAgICAgICAgZHJhd19ub19wcm9tbygpO1xyXG4gICAgICAgICAgICBjb25zdCBwcm9tb3RlZCA9IHByb21vdGUoY3RybC5nZXRHcm91bmQoKSwgcHJvbW90aW5nLmRlc3QsIHJvbGUpO1xyXG4gICAgICAgICAgICBsZXQgcHJvbW87XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKGN0cmwudmFyaWFudCkge1xyXG4gICAgICAgICAgICBjYXNlIFwic2hvZ2lcIjpcclxuICAgICAgICAgICAgICAgIHByb21vID0gcHJvbW90ZWQgPyBcIitcIiA6IFwiXCI7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcImdyYW5kaG91c2VcIjpcclxuICAgICAgICAgICAgY2FzZSBcImdyYW5kXCI6XHJcbiAgICAgICAgICAgICAgICBwcm9tbyA9IHByb21vdGVkID8gcm9sZVRvU2FuW3JvbGVdLnRvTG93ZXJDYXNlKCkgOiBcIlwiO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICBwcm9tbyA9IHJvbGVUb1Nhbltyb2xlXS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBpZiAocHJvbW90aW5nLmNhbGxiYWNrKSBwcm9tb3RpbmcuY2FsbGJhY2socHJvbW90aW5nLm9yaWcsIHByb21vdGluZy5kZXN0LCBwcm9tbyk7XHJcbiAgICAgICAgICAgIHByb21vdGluZyA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgZnVuY3Rpb24gY2FuY2VsKCkge1xyXG4gICAgICAgIGRyYXdfbm9fcHJvbW8oKTtcclxuICAgICAgICBjdHJsLmdvUGx5KGN0cmwucGx5KTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYmluZChldmVudE5hbWU6IHN0cmluZywgZjogKGU6IEV2ZW50KSA9PiB2b2lkLCByZWRyYXcpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBpbnNlcnQodm5vZGUpIHtcclxuICAgICAgICAgICAgICAgIHZub2RlLmVsbS5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgZSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzID0gZihlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocmVkcmF3KSByZWRyYXcoKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJlbmRlclByb21vdGlvbihkZXN0LCBjb2xvciwgb3JpZW50YXRpb24pIHtcclxuICAgICAgICBjb25zdCBkaW0gPSBjdHJsLmdldEdyb3VuZCgpLnN0YXRlLmRpbWVuc2lvbnNcclxuICAgICAgICBjb25zdCBmaXJzdFJhbmtJczAgPSBkaW0uaGVpZ2h0ID09PSAxMDtcclxuICAgICAgICB2YXIgbGVmdCA9IChkaW0ud2lkdGggLSBrZXkycG9zKGRlc3QsIGZpcnN0UmFua0lzMClbMF0pICogKDEwMCAvIGRpbS53aWR0aCk7XHJcbiAgICAgICAgaWYgKG9yaWVudGF0aW9uID09PSBcIndoaXRlXCIpIGxlZnQgPSAoMTAwIC8gZGltLndpZHRoKSAqIChkaW0ud2lkdGggLSAxKSAtIGxlZnQ7XHJcbiAgICAgICAgdmFyIHZlcnRpY2FsID0gY29sb3IgPT09IG9yaWVudGF0aW9uID8gXCJ0b3BcIiA6IFwiYm90dG9tXCI7XHJcbiAgICAgICAgcmV0dXJuIGgoXHJcbiAgICAgICAgICAgIFwiZGl2I2V4dGVuc2lvbl9jaG9pY2UuXCIgKyB2ZXJ0aWNhbCxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgaG9vazoge1xyXG4gICAgICAgICAgICAgICAgICAgIGluc2VydDogdm5vZGUgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbCA9IHZub2RlLmVsbSBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IGNhbmNlbCgpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcihcImNvbnRleHRtZW51XCIsIGUgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHJvbGVzLm1hcCgoc2VydmVyUm9sZSwgaSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdmFyIHRvcCA9IChjb2xvciA9PT0gb3JpZW50YXRpb24gPyBpIDogZGltLmhlaWdodCAtMSAtIGkpICogKDEwMCAvIGRpbS5oZWlnaHQpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGgoXHJcbiAgICAgICAgICAgICAgICAgICAgXCJzcXVhcmVcIixcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJzOiB7IHN0eWxlOiBcInRvcDogXCIgKyB0b3AgKyBcIiU7bGVmdDogXCIgKyBsZWZ0ICsgXCIlXCIgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaG9vazogYmluZChcImNsaWNrXCIsIGUgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbmlzaChzZXJ2ZXJSb2xlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgZmFsc2UpXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBbaChcInBpZWNlLlwiICsgc2VydmVyUm9sZSArIFwiLlwiICsgY29sb3IpXVxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhcnQsXHJcbiAgICB9O1xyXG59XHJcbiIsIi8vIGh0dHA6Ly9qc2ZpZGRsZS5uZXQvTWlzc291bGFMb3JlbnpvL2dmbjZvYjNqL1xuLy8gaHR0cHM6Ly9naXRodWIuY29tL29ybmljYXIvbGlsYS9ibG9iL21hc3Rlci91aS9jb21tb24vc3JjL3Jlc2l6ZS50c1xuXG5pbXBvcnQgKiBhcyBjZyBmcm9tICdjaGVzc2dyb3VuZHgvdHlwZXMnO1xuXG5leHBvcnQgdHlwZSBNb3VjaEV2ZW50ID0gTW91c2VFdmVudCAmIFRvdWNoRXZlbnQ7XG5cbi8vZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmVzaXplSGFuZGxlKGVsczogY2cuRWxlbWVudHMsIHByZWY6IG51bWJlciwgcGx5OiBudW1iZXIpIHtcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHJlc2l6ZUhhbmRsZShlbHM6IGNnLkVsZW1lbnRzKSB7XG5cbi8vICBpZiAoIXByZWYpIHJldHVybjtcbiAgaWYgKHRydWUpIHJldHVybjtcblxuICBjb25zdCBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NnLXJlc2l6ZScpO1xuICBlbHMuY29udGFpbmVyLmFwcGVuZENoaWxkKGVsKTtcblxuICBjb25zdCBtb3VzZW1vdmVFdmVudCA9ICdtb3VzZW1vdmUnO1xuICBjb25zdCBtb3VzZXVwRXZlbnQgPSAnbW91c2V1cCc7XG5cbiAgZWwuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgKHN0YXJ0OiBNb3VjaEV2ZW50KSA9PiB7XG5cbiAgICBzdGFydC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgY29uc3Qgc3RhcnRQb3MgPSBldmVudFBvc2l0aW9uKHN0YXJ0KSE7XG4gICAgY29uc3QgaW5pdGlhbFpvb20gPSAxMDA7ICAvL3BhcnNlSW50KGdldENvbXB1dGVkU3R5bGUoZG9jdW1lbnQuYm9keSkuZ2V0UHJvcGVydHlWYWx1ZSgnLS16b29tJykpO1xuICAgIGxldCB6b29tID0gaW5pdGlhbFpvb207XG4vKlxuICAgIGNvbnN0IHNhdmVab29tID0gd2luZG93LmxpY2hlc3MuZGVib3VuY2UoKCkgPT4ge1xuICAgICAgJC5hamF4KHsgbWV0aG9kOiAncG9zdCcsIHVybDogJy9wcmVmL3pvb20/dj0nICsgKDEwMCArIHpvb20pIH0pO1xuICAgIH0sIDcwMCk7XG4qL1xuXG4gICAgY29uc3Qgc2V0Wm9vbSA9ICh6b29tOiBudW1iZXIpID0+IHtcbiAgICAgICAgY29uc3QgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuY2ctd3JhcCcpIGFzIEhUTUxFbGVtZW50O1xuICAgICAgICBpZiAoZWwpIHtcbi8vICAgICAgICAgICAgY29uc3QgYmFzZVdpZHRoID0gZGltZW5zaW9uc1tWQVJJQU5UU1t0aGlzLnZhcmlhbnRdLmdlb21dLndpZHRoICogKHRoaXMudmFyaWFudCA9PT0gXCJzaG9naVwiID8gNTIgOiA2NCk7XG4vLyAgICAgICAgICAgIGNvbnN0IGJhc2VIZWlnaHQgPSBkaW1lbnNpb25zW1ZBUklBTlRTW3RoaXMudmFyaWFudF0uZ2VvbV0uaGVpZ2h0ICogKHRoaXMudmFyaWFudCA9PT0gXCJzaG9naVwiID8gNjAgOiA2NCk7XG4gICAgICAgICAgICBjb25zdCBiYXNlV2lkdGggPSBwYXJzZUludCggZG9jdW1lbnQuZGVmYXVsdFZpZXchLmdldENvbXB1dGVkU3R5bGUoIGVsICkud2lkdGggfHwgJycsIDEwKTtcbiAgICAgICAgICAgIGNvbnN0IGJhc2VIZWlnaHQgPSBwYXJzZUludChkb2N1bWVudC5kZWZhdWx0VmlldyEuZ2V0Q29tcHV0ZWRTdHlsZSggZWwgKS5oZWlnaHQgfHwgJycsIDEwKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGJhc2VXaWR0aCwgYmFzZUhlaWdodCwgem9vbSk7XG4gICAgICAgICAgICBjb25zdCBweHcgPSBgJHt6b29tIC8gMTAwICogYmFzZVdpZHRofXB4YDtcbiAgICAgICAgICAgIGNvbnN0IHB4aCA9IGAke3pvb20gLyAxMDAgKiBiYXNlSGVpZ2h0fXB4YDtcbiAgICAgICAgICAgIGVsLnN0eWxlLndpZHRoID0gcHh3O1xuICAgICAgICAgICAgZWwuc3R5bGUuaGVpZ2h0ID0gcHhoO1xuICAgICAgICAgICAgY29uc3QgZXYgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcbiAgICAgICAgICAgIGV2LmluaXRFdmVudCgnY2hlc3Nncm91bmQucmVzaXplJywgZmFsc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuZGlzcGF0Y2hFdmVudChldik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCByZXNpemUgPSAobW92ZTogTW91Y2hFdmVudCkgPT4ge1xuXG4gICAgICBjb25zdCBwb3MgPSBldmVudFBvc2l0aW9uKG1vdmUpITtcbiAgICAgIGNvbnN0IGRlbHRhID0gcG9zWzBdIC0gc3RhcnRQb3NbMF0gKyBwb3NbMV0gLSBzdGFydFBvc1sxXTtcblxuICAgICAgem9vbSA9IE1hdGgucm91bmQoTWF0aC5taW4oMTUwLCBNYXRoLm1heCgwLCBpbml0aWFsWm9vbSArIGRlbHRhIC8gMTApKSk7XG5cbi8vICAgICAgZG9jdW1lbnQuYm9keS5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJy0tem9vbTonICsgem9vbSk7XG4vLyAgICAgIHdpbmRvdy5saWNoZXNzLmRpc3BhdGNoRXZlbnQod2luZG93LCAncmVzaXplJyk7XG4gICAgICBzZXRab29tKHpvb20pO1xuLy8gICAgICBzYXZlWm9vbSgpO1xuICAgIH07XG5cbiAgICBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5hZGQoJ3Jlc2l6aW5nJyk7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKG1vdXNlbW92ZUV2ZW50LCByZXNpemUpO1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihtb3VzZXVwRXZlbnQsICgpID0+IHtcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIobW91c2Vtb3ZlRXZlbnQsIHJlc2l6ZSk7XG4gICAgICBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5yZW1vdmUoJ3Jlc2l6aW5nJyk7XG4gICAgfSwgeyBvbmNlOiB0cnVlIH0pO1xuICB9KTtcbi8qXG4gIGlmIChwcmVmID09IDEpIHtcbiAgICBjb25zdCB0b2dnbGUgPSAocGx5OiBudW1iZXIpID0+IGVsLmNsYXNzTGlzdC50b2dnbGUoJ25vbmUnLCBwbHkgPj0gMik7XG4gICAgdG9nZ2xlKHBseSk7XG4gICAgd2luZG93LmxpY2hlc3MucHVic3ViLm9uKCdwbHknLCB0b2dnbGUpO1xuICB9XG5cbiAgYWRkTmFnKGVsKTtcbiovXG59XG5cbmZ1bmN0aW9uIGV2ZW50UG9zaXRpb24oZTogTW91Y2hFdmVudCk6IFtudW1iZXIsIG51bWJlcl0gfCB1bmRlZmluZWQge1xuICBpZiAoZS5jbGllbnRYIHx8IGUuY2xpZW50WCA9PT0gMCkgcmV0dXJuIFtlLmNsaWVudFgsIGUuY2xpZW50WV07XG4gIGlmIChlLnRvdWNoZXMgJiYgZS50YXJnZXRUb3VjaGVzWzBdKSByZXR1cm4gW2UudGFyZ2V0VG91Y2hlc1swXS5jbGllbnRYLCBlLnRhcmdldFRvdWNoZXNbMF0uY2xpZW50WV07XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG4vKlxuZnVuY3Rpb24gYWRkTmFnKGVsOiBIVE1MRWxlbWVudCkge1xuXG4gIGNvbnN0IHN0b3JhZ2UgPSB3aW5kb3cubGljaGVzcy5zdG9yYWdlLm1ha2VCb29sZWFuKCdyZXNpemUtbmFnJyk7XG4gIGlmIChzdG9yYWdlLmdldCgpKSByZXR1cm47XG5cbiAgd2luZG93LmxpY2hlc3MubG9hZENzc1BhdGgoJ25hZy1jaXJjbGUnKTtcbiAgZWwudGl0bGUgPSAnRHJhZyB0byByZXNpemUnO1xuICBlbC5pbm5lckhUTUwgPSAnPGRpdiBjbGFzcz1cIm5hZy1jaXJjbGVcIj48L2Rpdj4nO1xuICBlbC5hZGRFdmVudExpc3RlbmVyKHdpbmRvdy5saWNoZXNzLm1vdXNlZG93bkV2ZW50LCAoKSA9PiB7XG4gICAgc3RvcmFnZS5zZXQodHJ1ZSk7XG4gICAgZWwuaW5uZXJIVE1MID0gJyc7XG4gIH0sIHsgb25jZTogdHJ1ZSB9KTtcblxuICBzZXRUaW1lb3V0KCgpID0+IHN0b3JhZ2Uuc2V0KHRydWUpLCAxNTAwMCk7XG59XG4qLyIsImltcG9ydCB7IGggfSBmcm9tIFwic25hYmJkb21cIjtcclxuaW1wb3J0IHsgVk5vZGUgfSBmcm9tICdzbmFiYmRvbS92bm9kZSc7XHJcblxyXG5pbXBvcnQgUm91bmRDb250cm9sbGVyIGZyb20gJy4vcm91bmRDdHJsJztcclxuaW1wb3J0IHsgVkFSSUFOVFMgfSBmcm9tICcuL2NoZXNzJztcclxuaW1wb3J0IHsgdGltZWFnbywgcmVuZGVyVGltZWFnbyB9IGZyb20gJy4vY2xvY2snO1xyXG5cclxuXHJcbmZ1bmN0aW9uIHJ1bkdyb3VuZCh2bm9kZTogVk5vZGUsIG1vZGVsKSB7XHJcbiAgICBjb25zdCBlbCA9IHZub2RlLmVsbSBhcyBIVE1MRWxlbWVudDtcclxuICAgIGNvbnN0IGN0cmwgPSBuZXcgUm91bmRDb250cm9sbGVyKGVsLCBtb2RlbCk7XHJcbiAgICBjb25zdCBjZyA9IGN0cmwuY2hlc3Nncm91bmQ7XHJcbiAgICB3aW5kb3dbJ2NnJ10gPSBjZztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJvdW5kVmlldyhtb2RlbCk6IFZOb2RlW10ge1xyXG4gICAgY29uc29sZS5sb2coXCJyb3VuZFZpZXcgbW9kZWw9XCIsIG1vZGVsKTtcclxuICAgIGNvbnN0IGRhdGFJY29uID0gVkFSSUFOVFNbbW9kZWxbXCJ2YXJpYW50XCJdXS5pY29uO1xyXG4gICAgcmVuZGVyVGltZWFnbygpO1xyXG4gICAgcmV0dXJuIFtoKCdhc2lkZS5zaWRlYmFyLWZpcnN0JywgW1xyXG4gICAgICAgICAgICAgICAgaCgnZGl2LmdhbWUtaW5mbycsIFtcclxuICAgICAgICAgICAgICAgICAgICBoKCdkaXYuaW5mbzAnLCB7YXR0cnM6IHtcImRhdGEtaWNvblwiOiBkYXRhSWNvbn0sIGNsYXNzOiB7XCJpY29uXCI6IHRydWV9fSwgW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBoKCdkaXYuaW5mbzEnLCB7YXR0cnM6IHtcImRhdGEtaWNvblwiOiAobW9kZWxbXCJjaGVzczk2MFwiXSA9PT0gJ1RydWUnKSA/IFwiVlwiIDogXCJcIn0sIGNsYXNzOiB7XCJpY29uXCI6IHRydWV9fSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2Rpdi5pbmZvMicsIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2Rpdi50YycsIG1vZGVsW1wiYmFzZVwiXSArIFwiK1wiICsgbW9kZWxbXCJpbmNcIl0gKyBcIiDigKIgQ2FzdWFsIOKAoiBcIiArIG1vZGVsW1widmFyaWFudFwiXSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBOdW1iZXIobW9kZWxbXCJzdGF0dXNcIl0pID49IDAgPyBoKCdpbmZvLWRhdGUnLCB7YXR0cnM6IHt0aW1lc3RhbXA6IG1vZGVsW1wiZGF0ZVwiXX19LCB0aW1lYWdvKG1vZGVsW1wiZGF0ZVwiXSkpIDogXCJQbGF5aW5nIHJpZ2h0IG5vd1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgICAgICAgICBoKCdkaXYucGxheWVyLWRhdGEnLCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2ktc2lkZS5vbmxpbmUnLCB7Y2xhc3M6IHtcImljb25cIjogdHJ1ZSwgXCJpY29uLXdoaXRlXCI6IHRydWV9IH0gKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaCgncGxheWVyJywgW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnYS51c2VyLWxpbmsnLCB7YXR0cnM6IHtocmVmOiAnL0AvJyArIG1vZGVsW1wid3BsYXllclwiXX19LCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgncGxheWVyLXRpdGxlJywgXCIgXCIgKyBtb2RlbFtcInd0aXRsZVwiXSArIFwiIFwiKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2RlbFtcIndwbGF5ZXJcIl0gKyBcIiAoMTUwMD8pXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgICAgICAgICAgaCgnZGl2LnBsYXllci1kYXRhJywgW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBoKCdpLXNpZGUub25saW5lJywge2NsYXNzOiB7XCJpY29uXCI6IHRydWUsIFwiaWNvbi1ibGFja1wiOiB0cnVlfSB9ICksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGgoJ3BsYXllcicsIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2EudXNlci1saW5rJywge2F0dHJzOiB7aHJlZjogJy9ALycgKyBtb2RlbFtcImJwbGF5ZXJcIl19fSwgW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ3BsYXllci10aXRsZScsIFwiIFwiICsgbW9kZWxbXCJidGl0bGVcIl0gKyBcIiBcIiksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9kZWxbXCJicGxheWVyXCJdICsgXCIgKDE1MDA/KVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgICAgICBoKCdkaXYucm91bmRjaGF0I3JvdW5kY2hhdCcpLFxyXG4gICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgaCgnbWFpbi5tYWluJywgW1xyXG4gICAgICAgICAgICAgICAgaCgnc2VsZWN0aW9uLicgKyBWQVJJQU5UU1ttb2RlbFtcInZhcmlhbnRcIl1dLmJvYXJkICsgJy4nICsgVkFSSUFOVFNbbW9kZWxbXCJ2YXJpYW50XCJdXS5waWVjZXMsIFtcclxuICAgICAgICAgICAgICAgICAgICBoKCdkaXYuY2ctd3JhcC4nICsgVkFSSUFOVFNbbW9kZWxbXCJ2YXJpYW50XCJdXS5jZyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgeyBob29rOiB7IGluc2VydDogKHZub2RlKSA9PiBydW5Hcm91bmQodm5vZGUsIG1vZGVsKX0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgIGgoJ2FzaWRlLnNpZGViYXItc2Vjb25kJywgW1xyXG4gICAgICAgICAgICAgICAgaCgnZGl2I3BvY2tldC13cmFwcGVyJywgW1xyXG4gICAgICAgICAgICAgICAgICAgIGgoJ2Rpdi4nICsgVkFSSUFOVFNbbW9kZWxbXCJ2YXJpYW50XCJdXS5waWVjZXMgKyAnLicgKyBtb2RlbFtcInZhcmlhbnRcIl0sIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaCgnZGl2LmNnLXdyYXAucG9ja2V0JywgW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnZGl2I3BvY2tldDAnKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgICAgIGgoJ2RpdiNjbG9jazAnKSxcclxuICAgICAgICAgICAgICAgIGgoJ2Rpdi5yb3VuZC1kYXRhJywgW1xyXG4gICAgICAgICAgICAgICAgICAgIGgoJ3JvdW5kLXBsYXllciNycGxheWVyMCcpLFxyXG4gICAgICAgICAgICAgICAgICAgIGgoJ2RpdiNtb3ZlLWNvbnRyb2xzJyksXHJcbiAgICAgICAgICAgICAgICAgICAgaCgnZGl2I2JvYXJkLXNldHRpbmdzJyksXHJcbiAgICAgICAgICAgICAgICAgICAgaCgnZGl2I21vdmVsaXN0LWJsb2NrJywgW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBoKCdkaXYjbW92ZWxpc3QnKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9oKCdkaXYjcmVzdWx0JyksXHJcbiAgICAgICAgICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgICAgICAgICAgaCgnZGl2I2dhbWUtY29udHJvbHMnKSxcclxuICAgICAgICAgICAgICAgICAgICBoKCdyb3VuZC1wbGF5ZXIjcnBsYXllcjEnKSxcclxuICAgICAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICAgICAgaCgnZGl2I2Nsb2NrMScpLFxyXG4gICAgICAgICAgICAgICAgaCgnZGl2I3BvY2tldC13cmFwcGVyJywgW1xyXG4gICAgICAgICAgICAgICAgICAgIGgoJ2Rpdi4nICsgVkFSSUFOVFNbbW9kZWxbXCJ2YXJpYW50XCJdXS5waWVjZXMgKyAnLicgKyBtb2RlbFtcInZhcmlhbnRcIl0sIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaCgnZGl2LmNnLXdyYXAucG9ja2V0JywgW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnZGl2I3BvY2tldDEnKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgICAgIGgoJ2RpdiNmbGlwJyksXHJcbiAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICBoKCd1bmRlci1sZWZ0JywgXCJTcGVjdGF0b3JzXCIpLFxyXG4gICAgICAgICAgICBoKCd1bmRlci1ib2FyZCcpLFxyXG4gICAgICAgIF07XHJcbn1cclxuIiwiaW1wb3J0IFNvY2tldHRlIGZyb20gJ3NvY2tldHRlJztcclxuXHJcbmltcG9ydCB7IGluaXQgfSBmcm9tICdzbmFiYmRvbSc7XHJcbmltcG9ydCB7IGggfSBmcm9tICdzbmFiYmRvbS9oJztcclxuaW1wb3J0IGtsYXNzIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvY2xhc3MnO1xyXG5pbXBvcnQgYXR0cmlidXRlcyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL2F0dHJpYnV0ZXMnO1xyXG5pbXBvcnQgcHJvcGVydGllcyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL3Byb3BzJztcclxuaW1wb3J0IGxpc3RlbmVycyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL2V2ZW50bGlzdGVuZXJzJztcclxuXHJcbmltcG9ydCB7IGtleTJwb3MsIHBvczJrZXkgfSBmcm9tICdjaGVzc2dyb3VuZHgvdXRpbCc7XHJcbmltcG9ydCB7IENoZXNzZ3JvdW5kIH0gZnJvbSAnY2hlc3Nncm91bmR4JztcclxuaW1wb3J0IHsgQXBpIH0gZnJvbSAnY2hlc3Nncm91bmR4L2FwaSc7XHJcbmltcG9ydCB7IENvbG9yLCBEZXN0cywgUGllY2VzRGlmZiwgUm9sZSwgS2V5LCBQb3MsIFBpZWNlIH0gZnJvbSAnY2hlc3Nncm91bmR4L3R5cGVzJztcclxuXHJcbmltcG9ydCB7IENsb2NrLCByZW5kZXJUaW1lIH0gZnJvbSAnLi9jbG9jayc7XHJcbmltcG9ydCBtYWtlR2F0aW5nIGZyb20gJy4vZ2F0aW5nJztcclxuaW1wb3J0IG1ha2VQcm9tb3Rpb24gZnJvbSAnLi9wcm9tb3Rpb24nO1xyXG5pbXBvcnQgeyBkcm9wSXNWYWxpZCwgcG9ja2V0VmlldywgdXBkYXRlUG9ja2V0cyB9IGZyb20gJy4vcG9ja2V0JztcclxuaW1wb3J0IHsgc291bmQgfSBmcm9tICcuL3NvdW5kJztcclxuaW1wb3J0IHsgdmFyaWFudHMsIGhhc0VwLCBuZWVkUG9ja2V0cywgcm9sZVRvU2FuLCB1Y2kydXNpLCB1c2kydWNpLCBncmFuZDJ6ZXJvLCB6ZXJvMmdyYW5kLCBWQVJJQU5UUyB9IGZyb20gJy4vY2hlc3MnO1xyXG5pbXBvcnQgeyByZW5kZXJVc2VybmFtZSB9IGZyb20gJy4vdXNlcic7XHJcbmltcG9ydCB7IGNoYXRNZXNzYWdlLCBjaGF0VmlldyB9IGZyb20gJy4vY2hhdCc7XHJcbmltcG9ydCB7IHNldHRpbmdzVmlldyB9IGZyb20gJy4vc2V0dGluZ3MnO1xyXG5pbXBvcnQgeyBtb3ZlbGlzdFZpZXcsIHVwZGF0ZU1vdmVsaXN0LCBzZWxlY3RNb3ZlIH0gZnJvbSAnLi9tb3ZlbGlzdCc7XHJcbmltcG9ydCByZXNpemVIYW5kbGUgZnJvbSAnLi9yZXNpemUnO1xyXG5pbXBvcnQgeyByZXN1bHQgfSBmcm9tICcuL3Byb2ZpbGUnXHJcbmltcG9ydCB7IHBsYXllciB9IGZyb20gJy4vcGxheWVyJztcclxuXHJcbmNvbnN0IHBhdGNoID0gaW5pdChba2xhc3MsIGF0dHJpYnV0ZXMsIHByb3BlcnRpZXMsIGxpc3RlbmVyc10pO1xyXG5cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJvdW5kQ29udHJvbGxlciB7XHJcbiAgICBtb2RlbDtcclxuICAgIHNvY2s7XHJcbiAgICBjaGVzc2dyb3VuZDogQXBpO1xyXG4gICAgZnVsbGZlbjogc3RyaW5nO1xyXG4gICAgd3BsYXllcjogc3RyaW5nO1xyXG4gICAgYnBsYXllcjogc3RyaW5nO1xyXG4gICAgYmFzZTogbnVtYmVyO1xyXG4gICAgaW5jOiBudW1iZXI7XHJcbiAgICBteWNvbG9yOiBDb2xvcjtcclxuICAgIG9wcGNvbG9yOiBDb2xvcjtcclxuICAgIHR1cm5Db2xvcjogQ29sb3I7XHJcbiAgICBjbG9ja3M6IGFueTtcclxuICAgIGFib3J0YWJsZTogYm9vbGVhbjtcclxuICAgIGdhbWVJZDogc3RyaW5nO1xyXG4gICAgdmFyaWFudDogc3RyaW5nO1xyXG4gICAgcG9ja2V0czogYW55O1xyXG4gICAgdnBvY2tldDA6IGFueTtcclxuICAgIHZwb2NrZXQxOiBhbnk7XHJcbiAgICB2cGxheWVyMDogYW55O1xyXG4gICAgdnBsYXllcjE6IGFueTtcclxuICAgIHZwbmc6IGFueTtcclxuICAgIGdhbWVDb250cm9sczogYW55O1xyXG4gICAgbW92ZUNvbnRyb2xzOiBhbnk7XHJcbiAgICBnYXRpbmc6IGFueTtcclxuICAgIHByb21vdGlvbjogYW55O1xyXG4gICAgZGVzdHM6IERlc3RzO1xyXG4gICAgcHJvbW90aW9uczogc3RyaW5nW107XHJcbiAgICBsYXN0bW92ZTogS2V5W107XHJcbiAgICBwcmVtb3ZlOiBhbnk7XHJcbiAgICBwcmVkcm9wOiBhbnk7XHJcbiAgICByZXN1bHQ6IHN0cmluZztcclxuICAgIGZsaXA6IGJvb2xlYW47XHJcbiAgICBzcGVjdGF0b3I6IGJvb2xlYW47XHJcbiAgICBvcHBJc1JhbmRvbU1vdmVyOiBib29sZWFuO1xyXG4gICAgc2V0dGluZ3M6IGJvb2xlYW47XHJcbiAgICB0djogYm9vbGVhbjtcclxuICAgIHN0YXR1czogbnVtYmVyO1xyXG4gICAgc3RlcHM7XHJcbiAgICBwZ246IHN0cmluZztcclxuICAgIHBseTogbnVtYmVyO1xyXG4gICAgcGxheWVyczogc3RyaW5nW107XHJcbiAgICB0aXRsZXM6IHN0cmluZ1tdO1xyXG4gICAgQ1NTaW5kZXhlc0I6IG51bWJlcltdO1xyXG4gICAgQ1NTaW5kZXhlc1A6IG51bWJlcltdO1xyXG4gICAgY2xpY2tEcm9wOiBQaWVjZSB8IHVuZGVmaW5lZDtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihlbCwgbW9kZWwpIHtcclxuICAgICAgICBjb25zdCBvbk9wZW4gPSAoZXZ0KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiY3RybC5vbk9wZW4oKVwiLCBldnQpO1xyXG4gICAgICAgICAgICB0aGlzLmNsb2Nrc1swXS5jb25uZWN0aW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuY2xvY2tzWzFdLmNvbm5lY3RpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5kb1NlbmQoeyB0eXBlOiBcImdhbWVfdXNlcl9jb25uZWN0ZWRcIiwgdXNlcm5hbWU6IHRoaXMubW9kZWxbXCJ1c2VybmFtZVwiXSwgZ2FtZUlkOiB0aGlzLm1vZGVsW1wiZ2FtZUlkXCJdIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGNvbnN0IG9wdHMgPSB7XHJcbiAgICAgICAgICAgIG1heEF0dGVtcHRzOiAxMCxcclxuICAgICAgICAgICAgb25vcGVuOiBlID0+IG9uT3BlbihlKSxcclxuICAgICAgICAgICAgb25tZXNzYWdlOiBlID0+IHRoaXMub25NZXNzYWdlKGUpLFxyXG4gICAgICAgICAgICBvbnJlY29ubmVjdDogZSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNsb2Nrc1swXS5jb25uZWN0aW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2xvY2tzWzFdLmNvbm5lY3RpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1JlY29ubmVjdGluZyBpbiByb3VuZC4uLicsIGUpO1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheWVyMScpIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgcGF0Y2goY29udGFpbmVyLCBoKCdpLXNpZGUub25saW5lI3BsYXllcjEnLCB7Y2xhc3M6IHtcImljb25cIjogdHJ1ZSwgXCJpY29uLW9ubGluZVwiOiBmYWxzZSwgXCJpY29uLW9mZmxpbmVcIjogdHJ1ZX19KSk7XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBvbm1heGltdW06IGUgPT4gY29uc29sZS5sb2coJ1N0b3AgQXR0ZW1wdGluZyEnLCBlKSxcclxuICAgICAgICAgICAgb25jbG9zZTogZSA9PiBjb25zb2xlLmxvZygnQ2xvc2VkIScsIGUpLFxyXG4gICAgICAgICAgICBvbmVycm9yOiBlID0+IGNvbnNvbGUubG9nKCdFcnJvcjonLCBlKSxcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgdGhpcy5zb2NrID0gbmV3IFNvY2tldHRlKFwid3M6Ly9cIiArIGxvY2F0aW9uLmhvc3QgKyBcIi93c3JcIiwgb3B0cyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhdGNoKGVycikge1xyXG4gICAgICAgICAgICB0aGlzLnNvY2sgPSBuZXcgU29ja2V0dGUoXCJ3c3M6Ly9cIiArIGxvY2F0aW9uLmhvc3QgKyBcIi93c3JcIiwgb3B0cyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLm1vZGVsID0gbW9kZWw7XHJcbiAgICAgICAgdGhpcy52YXJpYW50ID0gbW9kZWxbXCJ2YXJpYW50XCJdIGFzIHN0cmluZztcclxuICAgICAgICB0aGlzLmZ1bGxmZW4gPSBtb2RlbFtcImZlblwiXSBhcyBzdHJpbmc7XHJcbiAgICAgICAgdGhpcy53cGxheWVyID0gbW9kZWxbXCJ3cGxheWVyXCJdIGFzIHN0cmluZztcclxuICAgICAgICB0aGlzLmJwbGF5ZXIgPSBtb2RlbFtcImJwbGF5ZXJcIl0gYXMgc3RyaW5nO1xyXG4gICAgICAgIHRoaXMuYmFzZSA9IG1vZGVsW1wiYmFzZVwiXSBhcyBudW1iZXI7XHJcbiAgICAgICAgdGhpcy5pbmMgPSBtb2RlbFtcImluY1wiXSBhcyBudW1iZXI7XHJcbiAgICAgICAgdGhpcy5zdGF0dXMgPSBtb2RlbFtcInN0YXR1c1wiXSBhcyBudW1iZXI7XHJcbiAgICAgICAgdGhpcy50diA9IG1vZGVsW1widHZcIl07XHJcbiAgICAgICAgdGhpcy5zdGVwcyA9IFtdO1xyXG4gICAgICAgIHRoaXMucGduID0gXCJcIjtcclxuICAgICAgICB0aGlzLnBseSA9IDA7XHJcblxyXG4gICAgICAgIHRoaXMuZmxpcCA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSB0cnVlO1xyXG4gICAgICAgIHRoaXMuQ1NTaW5kZXhlc0IgPSB2YXJpYW50cy5tYXAoKHZhcmlhbnQpID0+IGxvY2FsU3RvcmFnZVt2YXJpYW50ICsgXCJfYm9hcmRcIl0gPT09IHVuZGVmaW5lZCA/IDAgOiBOdW1iZXIobG9jYWxTdG9yYWdlW3ZhcmlhbnQgKyBcIl9ib2FyZFwiXSkpO1xyXG4gICAgICAgIHRoaXMuQ1NTaW5kZXhlc1AgPSB2YXJpYW50cy5tYXAoKHZhcmlhbnQpID0+IGxvY2FsU3RvcmFnZVt2YXJpYW50ICsgXCJfcGllY2VzXCJdID09PSB1bmRlZmluZWQgPyAwIDogTnVtYmVyKGxvY2FsU3RvcmFnZVt2YXJpYW50ICsgXCJfcGllY2VzXCJdKSk7XHJcblxyXG4gICAgICAgIHRoaXMuc3BlY3RhdG9yID0gdGhpcy5tb2RlbFtcInVzZXJuYW1lXCJdICE9PSB0aGlzLndwbGF5ZXIgJiYgdGhpcy5tb2RlbFtcInVzZXJuYW1lXCJdICE9PSB0aGlzLmJwbGF5ZXI7XHJcblxyXG4gICAgICAgIC8vIG9yaWVudGF0aW9uID0gdGhpcy5teWNvbG9yXHJcbiAgICAgICAgaWYgKHRoaXMuc3BlY3RhdG9yKSB7XHJcbiAgICAgICAgICAgIHRoaXMubXljb2xvciA9IHRoaXMudmFyaWFudCA9PT0gJ3Nob2dpJyA/ICdibGFjaycgOiAnd2hpdGUnO1xyXG4gICAgICAgICAgICB0aGlzLm9wcGNvbG9yID0gdGhpcy52YXJpYW50ID09PSAnc2hvZ2knID8gJ3doaXRlJyA6ICdibGFjayc7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5teWNvbG9yID0gdGhpcy5tb2RlbFtcInVzZXJuYW1lXCJdID09PSB0aGlzLndwbGF5ZXIgPyAnd2hpdGUnIDogJ2JsYWNrJztcclxuICAgICAgICAgICAgdGhpcy5vcHBjb2xvciA9IHRoaXMubW9kZWxbXCJ1c2VybmFtZVwiXSA9PT0gdGhpcy53cGxheWVyID8gJ2JsYWNrJyA6ICd3aGl0ZSc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLm9wcElzUmFuZG9tTW92ZXIgPSAoXHJcbiAgICAgICAgICAgICh0aGlzLm15Y29sb3IgPT09IFwid2hpdGVcIiAmJiB0aGlzLmJwbGF5ZXIgPT09IFwiUmFuZG9tLU1vdmVyXCIpIHx8XHJcbiAgICAgICAgICAgICh0aGlzLm15Y29sb3IgPT09IFwiYmxhY2tcIiAmJiB0aGlzLndwbGF5ZXIgPT09IFwiUmFuZG9tLU1vdmVyXCIpKTtcclxuXHJcbiAgICAgICAgLy8gcGxheWVyc1swXSBpcyB0b3AgcGxheWVyLCBwbGF5ZXJzWzFdIGlzIGJvdHRvbSBwbGF5ZXJcclxuICAgICAgICB0aGlzLnBsYXllcnMgPSBbXHJcbiAgICAgICAgICAgIHRoaXMubXljb2xvciA9PT0gXCJ3aGl0ZVwiID8gdGhpcy5icGxheWVyIDogdGhpcy53cGxheWVyLFxyXG4gICAgICAgICAgICB0aGlzLm15Y29sb3IgPT09IFwid2hpdGVcIiA/IHRoaXMud3BsYXllciA6IHRoaXMuYnBsYXllclxyXG4gICAgICAgIF07XHJcbiAgICAgICAgdGhpcy50aXRsZXMgPSBbXHJcbiAgICAgICAgICAgIHRoaXMubXljb2xvciA9PT0gXCJ3aGl0ZVwiID8gdGhpcy5tb2RlbFsnYnRpdGxlJ10gOiB0aGlzLm1vZGVsWyd3dGl0bGUnXSxcclxuICAgICAgICAgICAgdGhpcy5teWNvbG9yID09PSBcIndoaXRlXCIgPyB0aGlzLm1vZGVsWyd3dGl0bGUnXSA6IHRoaXMubW9kZWxbJ2J0aXRsZSddXHJcbiAgICAgICAgXTtcclxuXHJcbiAgICAgICAgdGhpcy5wcmVtb3ZlID0gbnVsbDtcclxuICAgICAgICB0aGlzLnByZWRyb3AgPSBudWxsO1xyXG5cclxuICAgICAgICB0aGlzLnJlc3VsdCA9IFwiXCI7XHJcbiAgICAgICAgY29uc3QgcGFydHMgPSB0aGlzLmZ1bGxmZW4uc3BsaXQoXCIgXCIpO1xyXG4gICAgICAgIHRoaXMuYWJvcnRhYmxlID0gTnVtYmVyKHBhcnRzW3BhcnRzLmxlbmd0aCAtIDFdKSA8PSAxO1xyXG5cclxuICAgICAgICBjb25zdCBmZW5fcGxhY2VtZW50ID0gcGFydHNbMF07XHJcbiAgICAgICAgdGhpcy50dXJuQ29sb3IgPSBwYXJ0c1sxXSA9PT0gXCJ3XCIgPyBcIndoaXRlXCIgOiBcImJsYWNrXCI7XHJcblxyXG4gICAgICAgIHRoaXMuc3RlcHMucHVzaCh7XHJcbiAgICAgICAgICAgICdmZW4nOiBmZW5fcGxhY2VtZW50LFxyXG4gICAgICAgICAgICAnbW92ZSc6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgJ2NoZWNrJzogZmFsc2UsXHJcbiAgICAgICAgICAgICd0dXJuQ29sb3InOiB0aGlzLnR1cm5Db2xvcixcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuY2hlc3Nncm91bmQgPSBDaGVzc2dyb3VuZChlbCwge1xyXG4gICAgICAgICAgICBmZW46IGZlbl9wbGFjZW1lbnQsXHJcbiAgICAgICAgICAgIGdlb21ldHJ5OiBWQVJJQU5UU1t0aGlzLnZhcmlhbnRdLmdlb20sXHJcbiAgICAgICAgICAgIG9yaWVudGF0aW9uOiB0aGlzLm15Y29sb3IsXHJcbiAgICAgICAgICAgIHR1cm5Db2xvcjogdGhpcy50dXJuQ29sb3IsXHJcbiAgICAgICAgICAgIGFuaW1hdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZXZlbnRzOiB7XHJcbiAgICAgICAgICAgICAgICBpbnNlcnQoZWxlbWVudHMpIHtyZXNpemVIYW5kbGUoZWxlbWVudHMpO31cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5zcGVjdGF0b3IpIHtcclxuICAgICAgICAgICAgdGhpcy5jaGVzc2dyb3VuZC5zZXQoe1xyXG4gICAgICAgICAgICAgICAgdmlld09ubHk6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBldmVudHM6IHtcclxuICAgICAgICAgICAgICAgICAgICBtb3ZlOiB0aGlzLm9uTW92ZSgpLFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmNoZXNzZ3JvdW5kLnNldCh7XHJcbiAgICAgICAgICAgICAgICBtb3ZhYmxlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZnJlZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IHRoaXMubXljb2xvcixcclxuICAgICAgICAgICAgICAgICAgICBzaG93RGVzdHM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFmdGVyOiB0aGlzLm9uVXNlck1vdmUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFmdGVyTmV3UGllY2U6IHRoaXMub25Vc2VyRHJvcCxcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgcHJlbW92YWJsZToge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldDogdGhpcy5zZXRQcmVtb3ZlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1bnNldDogdGhpcy51bnNldFByZW1vdmUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBwcmVkcm9wcGFibGU6IHtcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50czoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXQ6IHRoaXMuc2V0UHJlZHJvcCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdW5zZXQ6IHRoaXMudW5zZXRQcmVkcm9wLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgZXZlbnRzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbW92ZTogdGhpcy5vbk1vdmUoKSxcclxuICAgICAgICAgICAgICAgICAgICBkcm9wTmV3UGllY2U6IHRoaXMub25Ecm9wKCksXHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0OiB0aGlzLm9uU2VsZWN0KHRoaXMuY2hlc3Nncm91bmQuc3RhdGUuc2VsZWN0ZWQpLFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmdhdGluZyA9IG1ha2VHYXRpbmcodGhpcyk7XHJcbiAgICAgICAgdGhpcy5wcm9tb3Rpb24gPSBtYWtlUHJvbW90aW9uKHRoaXMpO1xyXG5cclxuICAgICAgICAvLyBpbml0aWFsaXplIHVzZXJzXHJcbiAgICAgICAgY29uc3QgcGxheWVyMCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdycGxheWVyMCcpIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgIGNvbnN0IHBsYXllcjEgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncnBsYXllcjEnKSBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICB0aGlzLnZwbGF5ZXIwID0gcGF0Y2gocGxheWVyMCwgcGxheWVyKCdwbGF5ZXIwJywgdGhpcy50aXRsZXNbMF0sIHRoaXMucGxheWVyc1swXSwgbW9kZWxbXCJsZXZlbFwiXSkpO1xyXG4gICAgICAgIHRoaXMudnBsYXllcjEgPSBwYXRjaChwbGF5ZXIxLCBwbGF5ZXIoJ3BsYXllcjEnLCB0aGlzLnRpdGxlc1sxXSwgdGhpcy5wbGF5ZXJzWzFdLCBtb2RlbFtcImxldmVsXCJdKSk7XHJcblxyXG4gICAgICAgIC8vIGluaXRpYWxpemUgcG9ja2V0c1xyXG4gICAgICAgIGlmIChuZWVkUG9ja2V0cyh0aGlzLnZhcmlhbnQpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHBvY2tldDAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncG9ja2V0MCcpIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgICAgICBjb25zdCBwb2NrZXQxID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BvY2tldDEnKSBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICAgICAgdXBkYXRlUG9ja2V0cyh0aGlzLCBwb2NrZXQwLCBwb2NrZXQxKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGluaXRpYWxpemUgY2xvY2tzXHJcbiAgICAgICAgY29uc3QgYzAgPSBuZXcgQ2xvY2sodGhpcy5iYXNlLCB0aGlzLmluYywgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Nsb2NrMCcpIGFzIEhUTUxFbGVtZW50LCAnY2xvY2swJyk7XHJcbiAgICAgICAgY29uc3QgYzEgPSBuZXcgQ2xvY2sodGhpcy5iYXNlLCB0aGlzLmluYywgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Nsb2NrMScpIGFzIEhUTUxFbGVtZW50LCAnY2xvY2sxJyk7XHJcbiAgICAgICAgdGhpcy5jbG9ja3MgPSBbYzAsIGMxXTtcclxuICAgICAgICB0aGlzLmNsb2Nrc1swXS5vblRpY2socmVuZGVyVGltZSk7XHJcbiAgICAgICAgdGhpcy5jbG9ja3NbMV0ub25UaWNrKHJlbmRlclRpbWUpO1xyXG5cclxuICAgICAgICBjb25zdCBvbk1vcmVUaW1lID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAvLyBUT0RPOiBlbmFibGUgd2hlbiB0aGlzLmZsaXAgaXMgdHJ1ZVxyXG4gICAgICAgICAgICBpZiAodGhpcy5tb2RlbFsnd3RpdGxlJ10gPT09ICdCT1QnIHx8IHRoaXMubW9kZWxbJ2J0aXRsZSddID09PSAnQk9UJyB8fCB0aGlzLnNwZWN0YXRvciB8fCB0aGlzLnN0YXR1cyA+PSAwIHx8IHRoaXMuZmxpcCkgcmV0dXJuO1xyXG4gICAgICAgICAgICB0aGlzLmNsb2Nrc1swXS5zZXRUaW1lKHRoaXMuY2xvY2tzWzBdLmR1cmF0aW9uICsgMTUgKiAxMDAwKTtcclxuICAgICAgICAgICAgdGhpcy5kb1NlbmQoeyB0eXBlOiBcIm1vcmV0aW1lXCIsIGdhbWVJZDogdGhpcy5tb2RlbFtcImdhbWVJZFwiXSB9KTtcclxuICAgICAgICAgICAgY2hhdE1lc3NhZ2UoJycsIHRoaXMub3BwY29sb3IgKyAnICsxNSBzZWNvbmRzJywgXCJyb3VuZGNoYXRcIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Nsb2NrMCcpIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgIHBhdGNoKGNvbnRhaW5lciwgaCgnZGl2LmNsb2NrLXdyYXAjY2xvY2swJywgW1xyXG4gICAgICAgICAgICBoKCdkaXYubW9yZS10aW1lJywgW1xyXG4gICAgICAgICAgICAgICAgaCgnYnV0dG9uLmljb24uaWNvbi1wbHVzLXNxdWFyZScsIHtcclxuICAgICAgICAgICAgICAgICAgICBwcm9wczoge3R5cGU6IFwiYnV0dG9uXCIsIHRpdGxlOiBcIkdpdmUgMTUgc2Vjb25kc1wifSxcclxuICAgICAgICAgICAgICAgICAgICBvbjoge2NsaWNrOiAoKSA9PiBvbk1vcmVUaW1lKCkgfVxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgXSlcclxuICAgICAgICBdKVxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIGNvbnN0IGZsYWdDYWxsYmFjayA9ICgpID0+IHtcclxuICAgICAgICAgICAgaWYgKHRoaXMudHVybkNvbG9yID09PSB0aGlzLm15Y29sb3IpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2hlc3Nncm91bmQuc3RvcCgpO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJGbGFnXCIpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kb1NlbmQoeyB0eXBlOiBcImZsYWdcIiwgZ2FtZUlkOiB0aGlzLm1vZGVsW1wiZ2FtZUlkXCJdIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghdGhpcy5zcGVjdGF0b3IpIHRoaXMuY2xvY2tzWzFdLm9uRmxhZyhmbGFnQ2FsbGJhY2spO1xyXG5cclxuICAgICAgICBjb25zdCBhYm9ydCA9ICgpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJBYm9ydFwiKTtcclxuICAgICAgICAgICAgdGhpcy5kb1NlbmQoeyB0eXBlOiBcImFib3J0XCIsIGdhbWVJZDogdGhpcy5tb2RlbFtcImdhbWVJZFwiXSB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGRyYXcgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRHJhd1wiKTtcclxuICAgICAgICAgICAgdGhpcy5kb1NlbmQoeyB0eXBlOiBcImRyYXdcIiwgZ2FtZUlkOiB0aGlzLm1vZGVsW1wiZ2FtZUlkXCJdIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgcmVzaWduID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJlc2lnblwiKTtcclxuICAgICAgICAgICAgdGhpcy5kb1NlbmQoeyB0eXBlOiBcInJlc2lnblwiLCBnYW1lSWQ6IHRoaXMubW9kZWxbXCJnYW1lSWRcIl0gfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dhbWUtY29udHJvbHMnKSBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICBpZiAoIXRoaXMuc3BlY3RhdG9yKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZ2FtZUNvbnRyb2xzID0gcGF0Y2goY29udGFpbmVyLCBoKCdkaXYuYnRuLWNvbnRyb2xzJywgW1xyXG4gICAgICAgICAgICAgICAgaCgnYnV0dG9uI2Fib3J0JywgeyBvbjogeyBjbGljazogKCkgPT4gYWJvcnQoKSB9LCBwcm9wczoge3RpdGxlOiAnQWJvcnQnfSB9LCBbaCgnaScsIHtjbGFzczoge1wiaWNvblwiOiB0cnVlLCBcImljb24tYWJvcnRcIjogdHJ1ZX0gfSApLCBdKSxcclxuICAgICAgICAgICAgICAgIGgoJ2J1dHRvbiNkcmF3JywgeyBvbjogeyBjbGljazogKCkgPT4gZHJhdygpIH0sIHByb3BzOiB7dGl0bGU6IFwiRHJhd1wifSB9LCBbaCgnaScsIHtjbGFzczoge1wiaWNvblwiOiB0cnVlLCBcImljb24taGFuZC1wYXBlci1vXCI6IHRydWV9IH0gKSwgXSksXHJcbiAgICAgICAgICAgICAgICBoKCdidXR0b24jcmVzaWduJywgeyBvbjogeyBjbGljazogKCkgPT4gcmVzaWduKCkgfSwgcHJvcHM6IHt0aXRsZTogXCJSZXNpZ25cIn0gfSwgW2goJ2knLCB7Y2xhc3M6IHtcImljb25cIjogdHJ1ZSwgXCJpY29uLWZsYWctb1wiOiB0cnVlfSB9ICksIF0pLFxyXG4gICAgICAgICAgICAgICAgXSlcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmdhbWVDb250cm9scyA9IHBhdGNoKGNvbnRhaW5lciwgaCgnZGl2JykpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcGF0Y2goZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JvYXJkLXNldHRpbmdzJykgYXMgSFRNTEVsZW1lbnQsIHNldHRpbmdzVmlldyh0aGlzKSk7XHJcblxyXG4gICAgICAgIHBhdGNoKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtb3ZlbGlzdCcpIGFzIEhUTUxFbGVtZW50LCBtb3ZlbGlzdFZpZXcodGhpcykpO1xyXG5cclxuICAgICAgICBwYXRjaChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncm91bmRjaGF0JykgYXMgSFRNTEVsZW1lbnQsIGNoYXRWaWV3KHRoaXMsIFwicm91bmRjaGF0XCIpKTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRHcm91bmQgPSAoKSA9PiB0aGlzLmNoZXNzZ3JvdW5kO1xyXG4gICAgZ2V0RGVzdHMgPSAoKSA9PiB0aGlzLmRlc3RzO1xyXG5cclxuICAgIHByaXZhdGUgb25Nc2dHYW1lU3RhcnQgPSAobXNnKSA9PiB7XHJcbiAgICAgICAgLy8gY29uc29sZS5sb2coXCJnb3QgZ2FtZVN0YXJ0IG1zZzpcIiwgbXNnKTtcclxuICAgICAgICBpZiAobXNnLmdhbWVJZCAhPT0gdGhpcy5tb2RlbFtcImdhbWVJZFwiXSkgcmV0dXJuO1xyXG4gICAgICAgIGlmICghdGhpcy5zcGVjdGF0b3IpIHNvdW5kLmdlbmVyaWNOb3RpZnkoKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uTXNnTmV3R2FtZSA9IChtc2cpID0+IHtcclxuICAgICAgICB3aW5kb3cubG9jYXRpb24uYXNzaWduKHRoaXMubW9kZWxbXCJob21lXCJdICsgJy8nICsgbXNnW1wiZ2FtZUlkXCJdKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlbWF0Y2ggPSAoKSA9PiB7XHJcbiAgICAgICAgdGhpcy5kb1NlbmQoeyB0eXBlOiBcInJlbWF0Y2hcIiwgZ2FtZUlkOiB0aGlzLm1vZGVsW1wiZ2FtZUlkXCJdIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgbmV3T3Bwb25lbnQgPSAoaG9tZSkgPT4ge1xyXG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5hc3NpZ24oaG9tZSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhbmFseXNpcyA9IChob21lKSA9PiB7XHJcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5hc3NpZ24oaG9tZSArICcvJyArIHRoaXMubW9kZWxbXCJnYW1lSWRcIl0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2FtZU92ZXIgPSAoKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ2dhbWVPdmVyKCknLCByZXN1bHQodGhpcy5zdGF0dXMsIHRoaXMucmVzdWx0KSk7XHJcbiAgICAgICAgLy92YXIgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3VsdCcpIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgIC8vcGF0Y2goY29udGFpbmVyLCBoKCdkaXYjcmVzdWx0JywgcmVzdWx0KHRoaXMuc3RhdHVzLCB0aGlzLnJlc3VsdCkpKTtcclxuICAgICAgICAvL2NvbnN0IG1vdmVsaXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21vdmVsaXN0JykgYXMgSFRNTEVsZW1lbnQ7XHJcbiAgICAgICAgdmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtb3ZlcycpIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgIHBhdGNoKGNvbnRhaW5lciwgaCgnZGl2I21vdmVzJywgW2goJ2RpdiNyZXN1bHQnLCByZXN1bHQodGhpcy5zdGF0dXMsIHRoaXMucmVzdWx0KSldKSk7XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5zcGVjdGF0b3IpIHtcclxuICAgICAgICAgICAgdGhpcy5nYW1lQ29udHJvbHMgPSBwYXRjaCh0aGlzLmdhbWVDb250cm9scywgaCgnZGl2JykpO1xyXG4gICAgICAgICAgICBwYXRjaCh0aGlzLmdhbWVDb250cm9scywgaCgnZGl2I2FmdGVyLWdhbWUtY29udHJvbHMnLCBbXHJcbiAgICAgICAgICAgICAgICBoKCdidXR0b24ucmVtYXRjaCcsIHsgb246IHsgY2xpY2s6ICgpID0+IHRoaXMucmVtYXRjaCgpIH0gfSwgXCJSRU1BVENIXCIpLFxyXG4gICAgICAgICAgICAgICAgaCgnYnV0dG9uLm5ld29wcCcsIHsgb246IHsgY2xpY2s6ICgpID0+IHRoaXMubmV3T3Bwb25lbnQodGhpcy5tb2RlbFtcImhvbWVcIl0pIH0gfSwgXCJORVcgT1BQT05FTlRcIiksXHJcbiAgICAgICAgICAgICAgICBoKCdidXR0b24uYW5hbHlzaXMnLCB7IG9uOiB7IGNsaWNrOiAoKSA9PiB0aGlzLmFuYWx5c2lzKHRoaXMubW9kZWxbXCJob21lXCJdKSB9IH0sIFwiQU5BTFlTSVMgQk9BUkRcIiksXHJcbiAgICAgICAgICAgIF0pKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjaGVja1N0YXR1cyA9IChtc2cpID0+IHtcclxuICAgICAgICBpZiAobXNnLmdhbWVJZCAhPT0gdGhpcy5tb2RlbFtcImdhbWVJZFwiXSkgcmV0dXJuO1xyXG4gICAgICAgIGlmIChtc2cuc3RhdHVzID49IDAgJiYgdGhpcy5yZXN1bHQgPT09IFwiXCIpIHtcclxuICAgICAgICAgICAgdGhpcy5jbG9ja3NbMF0ucGF1c2UoZmFsc2UpO1xyXG4gICAgICAgICAgICB0aGlzLmNsb2Nrc1sxXS5wYXVzZShmYWxzZSk7XHJcbiAgICAgICAgICAgIHRoaXMucmVzdWx0ID0gbXNnLnJlc3VsdDtcclxuICAgICAgICAgICAgdGhpcy5zdGF0dXMgPSBtc2cuc3RhdHVzO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKG1zZy5yZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCIxLzItMS8yXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgc291bmQuZHJhdygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcIjEtMFwiOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5zcGVjdGF0b3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMubXljb2xvciA9PT0gXCJ3aGl0ZVwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VuZC52aWN0b3J5KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VuZC5kZWZlYXQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgXCIwLTFcIjpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuc3BlY3RhdG9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm15Y29sb3IgPT09IFwiYmxhY2tcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc291bmQudmljdG9yeSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc291bmQuZGVmZWF0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAvLyBBQk9SVEVEXHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuZ2FtZU92ZXIoKTtcclxuICAgICAgICAgICAgc2VsZWN0TW92ZSh0aGlzLCB0aGlzLnBseSk7XHJcblxyXG4gICAgICAgICAgICAvLyBjbGVhbiB1cCBnYXRpbmcvcHJvbW90aW9uIHdpZGdldCBsZWZ0IG92ZXIgdGhlIGdyb3VuZCB3aGlsZSBnYW1lIGVuZGVkIGJ5IHRpbWUgb3V0XHJcbiAgICAgICAgICAgIHZhciBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZXh0ZW5zaW9uX2Nob2ljZScpIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgICAgICBpZiAoY29udGFpbmVyIGluc3RhbmNlb2YgRWxlbWVudCkgcGF0Y2goY29udGFpbmVyLCBoKCdleHRlbnNpb24nKSk7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy50dikge1xyXG4gICAgICAgICAgICAgICAgc2V0SW50ZXJ2YWwoKCkgPT4ge3RoaXMuZG9TZW5kKHsgdHlwZTogXCJ1cGRhdGVUVlwiLCBnYW1lSWQ6IHRoaXMubW9kZWxbXCJnYW1lSWRcIl0sIHByb2ZpbGVJZDogdGhpcy5tb2RlbFtcInByb2ZpbGVpZFwiXSB9KTt9LCAyMDAwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uTXNnVXBkYXRlVFYgPSAobXNnKSA9PiB7XHJcbiAgICAgICAgaWYgKG1zZy5nYW1lSWQgIT09IHRoaXMubW9kZWxbXCJnYW1lSWRcIl0pIHtcclxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmFzc2lnbih0aGlzLm1vZGVsW1wiaG9tZVwiXSArICcvdHYnKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbk1zZ0JvYXJkID0gKG1zZykgPT4ge1xyXG4gICAgICAgIGlmIChtc2cuZ2FtZUlkICE9PSB0aGlzLm1vZGVsW1wiZ2FtZUlkXCJdKSByZXR1cm47XHJcblxyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwiZ290IGJvYXJkIG1zZzpcIiwgbXNnKTtcclxuICAgICAgICB0aGlzLnBseSA9IG1zZy5wbHlcclxuICAgICAgICB0aGlzLmZ1bGxmZW4gPSBtc2cuZmVuO1xyXG4gICAgICAgIHRoaXMuZGVzdHMgPSBtc2cuZGVzdHM7XHJcbiAgICAgICAgLy8gbGlzdCBvZiBsZWdhbCBwcm9tb3Rpb24gbW92ZXNcclxuICAgICAgICB0aGlzLnByb21vdGlvbnMgPSBtc2cucHJvbW87XHJcbiAgICAgICAgY29uc3QgY2xvY2tzID0gbXNnLmNsb2NrcztcclxuXHJcbiAgICAgICAgY29uc3QgcGFydHMgPSBtc2cuZmVuLnNwbGl0KFwiIFwiKTtcclxuICAgICAgICB0aGlzLnR1cm5Db2xvciA9IHBhcnRzWzFdID09PSBcIndcIiA/IFwid2hpdGVcIiA6IFwiYmxhY2tcIjtcclxuXHJcbiAgICAgICAgaWYgKG1zZy5zdGVwcy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3RlcHMgPSBbXTtcclxuICAgICAgICAgICAgdmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtb3ZlbGlzdCcpIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgICAgICBwYXRjaChjb250YWluZXIsIGgoJ2RpdiNtb3ZlbGlzdCcpKTtcclxuXHJcbiAgICAgICAgICAgIG1zZy5zdGVwcy5mb3JFYWNoKChzdGVwKSA9PiB7IFxyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGVwcy5wdXNoKHN0ZXApO1xyXG4gICAgICAgICAgICAgICAgdXBkYXRlTW92ZWxpc3QodGhpcyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAobXNnLnBseSA9PT0gdGhpcy5zdGVwcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHN0ZXAgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJ2Zlbic6IG1zZy5mZW4sXHJcbiAgICAgICAgICAgICAgICAgICAgJ21vdmUnOiBtc2cubGFzdE1vdmUsXHJcbiAgICAgICAgICAgICAgICAgICAgJ2NoZWNrJzogbXNnLmNoZWNrLFxyXG4gICAgICAgICAgICAgICAgICAgICd0dXJuQ29sb3InOiB0aGlzLnR1cm5Db2xvcixcclxuICAgICAgICAgICAgICAgICAgICAnc2FuJzogbXNnLnN0ZXBzWzBdLnNhbixcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGVwcy5wdXNoKHN0ZXApO1xyXG4gICAgICAgICAgICAgICAgdXBkYXRlTW92ZWxpc3QodGhpcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuYWJvcnRhYmxlID0gTnVtYmVyKHBhcnRzW3BhcnRzLmxlbmd0aCAtIDFdKSA8PSAxO1xyXG4gICAgICAgIGlmICghdGhpcy5zcGVjdGF0b3IgJiYgIXRoaXMuYWJvcnRhYmxlICYmIHRoaXMucmVzdWx0ID09PSBcIlwiKSB7XHJcbiAgICAgICAgICAgIHZhciBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYWJvcnQnKSBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICAgICAgcGF0Y2goY29udGFpbmVyLCBoKCdidXR0b24jYWJvcnQnLCB7IHByb3BzOiB7ZGlzYWJsZWQ6IHRydWV9IH0pKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBsYXN0TW92ZSA9IG1zZy5sYXN0TW92ZTtcclxuICAgICAgICBpZiAobGFzdE1vdmUgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMudmFyaWFudCA9PT0gXCJzaG9naVwiKSB7XHJcbiAgICAgICAgICAgICAgICBsYXN0TW92ZSA9IHVzaTJ1Y2kobGFzdE1vdmUpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMudmFyaWFudCA9PT0gXCJncmFuZFwiIHx8IHRoaXMudmFyaWFudCA9PT0gXCJncmFuZGhvdXNlXCIpIHtcclxuICAgICAgICAgICAgICAgIGxhc3RNb3ZlID0gZ3JhbmQyemVybyhsYXN0TW92ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbGFzdE1vdmUgPSBbbGFzdE1vdmUuc2xpY2UoMCwyKSwgbGFzdE1vdmUuc2xpY2UoMiw0KV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIGRyb3AgbGFzdE1vdmUgY2F1c2luZyBzY3JvbGxiYXIgZmxpY2tlcixcclxuICAgICAgICAvLyBzbyB3ZSByZW1vdmUgZnJvbSBwYXJ0IHRvIGF2b2lkIHRoYXRcclxuICAgICAgICBpZiAobGFzdE1vdmUgIT09IG51bGwgJiYgbGFzdE1vdmVbMF1bMV0gPT09ICdAJykgbGFzdE1vdmUgPSBbbGFzdE1vdmVbMV1dO1xyXG4gICAgICAgIC8vIHNhdmUgY2FwdHVyZSBzdGF0ZSBiZWZvcmUgdXBkYXRpbmcgY2hlc3Nncm91bmRcclxuICAgICAgICBjb25zdCBjYXB0dXJlID0gbGFzdE1vdmUgIT09IG51bGwgJiYgdGhpcy5jaGVzc2dyb3VuZC5zdGF0ZS5waWVjZXNbbGFzdE1vdmVbMV1dXHJcblxyXG4gICAgICAgIGlmIChsYXN0TW92ZSAhPT0gbnVsbCAmJiAodGhpcy50dXJuQ29sb3IgPT09IHRoaXMubXljb2xvciB8fCB0aGlzLnNwZWN0YXRvcikpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMudmFyaWFudCA9PT0gXCJzaG9naVwiKSB7XHJcbiAgICAgICAgICAgICAgICBzb3VuZC5zaG9naW1vdmUoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmIChjYXB0dXJlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc291bmQuY2FwdHVyZSgpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBzb3VuZC5tb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsYXN0TW92ZSA9IFtdO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmNoZWNrU3RhdHVzKG1zZyk7XHJcbiAgICAgICAgaWYgKG1zZy5jaGVjaykge1xyXG4gICAgICAgICAgICBzb3VuZC5jaGVjaygpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgb3BwY2xvY2sgPSAhdGhpcy5mbGlwID8gMCA6IDE7XHJcbiAgICAgICAgY29uc3QgbXljbG9jayA9IDEgLSBvcHBjbG9jaztcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuc3BlY3RhdG9yKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2hlc3Nncm91bmQuc2V0KHtcclxuICAgICAgICAgICAgICAgIGZlbjogcGFydHNbMF0sXHJcbiAgICAgICAgICAgICAgICB0dXJuQ29sb3I6IHRoaXMudHVybkNvbG9yLFxyXG4gICAgICAgICAgICAgICAgY2hlY2s6IG1zZy5jaGVjayxcclxuICAgICAgICAgICAgICAgIGxhc3RNb3ZlOiBsYXN0TW92ZSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHVwZGF0ZVBvY2tldHModGhpcywgdGhpcy52cG9ja2V0MCwgdGhpcy52cG9ja2V0MSk7XHJcbiAgICAgICAgICAgIHRoaXMuY2xvY2tzWzBdLnBhdXNlKGZhbHNlKTtcclxuICAgICAgICAgICAgdGhpcy5jbG9ja3NbMV0ucGF1c2UoZmFsc2UpO1xyXG4gICAgICAgICAgICB0aGlzLmNsb2Nrc1tvcHBjbG9ja10uc2V0VGltZShjbG9ja3NbdGhpcy5vcHBjb2xvcl0pO1xyXG4gICAgICAgICAgICB0aGlzLmNsb2Nrc1tteWNsb2NrXS5zZXRUaW1lKGNsb2Nrc1t0aGlzLm15Y29sb3JdKTtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmFib3J0YWJsZSAmJiBtc2cuc3RhdHVzIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudHVybkNvbG9yID09PSB0aGlzLm15Y29sb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsb2Nrc1tteWNsb2NrXS5zdGFydCgpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsb2Nrc1tvcHBjbG9ja10uc3RhcnQoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnR1cm5Db2xvciA9PT0gdGhpcy5teWNvbG9yKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNoZXNzZ3JvdW5kLnNldCh7XHJcbiAgICAgICAgICAgICAgICAgICAgZmVuOiBwYXJ0c1swXSxcclxuICAgICAgICAgICAgICAgICAgICB0dXJuQ29sb3I6IHRoaXMudHVybkNvbG9yLFxyXG4gICAgICAgICAgICAgICAgICAgIG1vdmFibGU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZnJlZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yOiB0aGlzLm15Y29sb3IsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc3RzOiBtc2cuZGVzdHMsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBjaGVjazogbXNnLmNoZWNrLFxyXG4gICAgICAgICAgICAgICAgICAgIGxhc3RNb3ZlOiBsYXN0TW92ZSxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgdXBkYXRlUG9ja2V0cyh0aGlzLCB0aGlzLnZwb2NrZXQwLCB0aGlzLnZwb2NrZXQxKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2xvY2tzW29wcGNsb2NrXS5wYXVzZShmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNsb2Nrc1tvcHBjbG9ja10uc2V0VGltZShjbG9ja3NbdGhpcy5vcHBjb2xvcl0pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbG9ja3NbbXljbG9ja10uc2V0VGltZShjbG9ja3NbdGhpcy5teWNvbG9yXSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuYWJvcnRhYmxlICYmIG1zZy5zdGF0dXMgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbG9ja3NbbXljbG9ja10uc3RhcnQoY2xvY2tzW3RoaXMubXljb2xvcl0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdNWSBDTE9DSyBTVEFSVEVEJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcInRyeWluZyB0byBwbGF5IHByZW1vdmUuLi4uXCIpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucHJlbW92ZSkgdGhpcy5wZXJmb3JtUHJlbW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucHJlZHJvcCkgdGhpcy5wZXJmb3JtUHJlZHJvcCgpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jaGVzc2dyb3VuZC5zZXQoe1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGdpdmluZyBmZW4gaGVyZSB3aWxsIHBsYWNlIGNhc3RsaW5nIHJvb2tzIHRvIHRoZWlyIGRlc3RpbmF0aW9uIGluIGNoZXNzOTYwIHZhcmlhbnRzXHJcbiAgICAgICAgICAgICAgICAgICAgZmVuOiBwYXJ0c1swXSxcclxuICAgICAgICAgICAgICAgICAgICB0dXJuQ29sb3I6IHRoaXMudHVybkNvbG9yLFxyXG4gICAgICAgICAgICAgICAgICAgIHByZW1vdmFibGU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzdHM6IG1zZy5kZXN0cyxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrOiBtc2cuY2hlY2ssXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2xvY2tzW215Y2xvY2tdLnBhdXNlKGZhbHNlKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2xvY2tzW215Y2xvY2tdLnNldFRpbWUoY2xvY2tzW3RoaXMubXljb2xvcl0pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbG9ja3Nbb3BwY2xvY2tdLnNldFRpbWUoY2xvY2tzW3RoaXMub3BwY29sb3JdKTtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5hYm9ydGFibGUgJiYgbXNnLnN0YXR1cyA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsb2Nrc1tvcHBjbG9ja10uc3RhcnQoY2xvY2tzW3RoaXMub3BwY29sb3JdKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnT1BQIENMT0NLICBTVEFSVEVEJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHBJc1JhbmRvbU1vdmVyICYmIG1zZy5ybSAgIT09IFwiXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRvU2VuZCh7IHR5cGU6IFwibW92ZVwiLCBnYW1lSWQ6IHRoaXMubW9kZWxbXCJnYW1lSWRcIl0sIG1vdmU6IG1zZy5ybSwgY2xvY2tzOiBjbG9ja3MgfSk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgZ29QbHkgPSAocGx5KSA9PiB7XHJcbiAgICAgICAgY29uc3Qgc3RlcCA9IHRoaXMuc3RlcHNbcGx5XTtcclxuICAgICAgICB2YXIgbW92ZSA9IHN0ZXBbJ21vdmUnXTtcclxuICAgICAgICB2YXIgY2FwdHVyZSA9IGZhbHNlO1xyXG4gICAgICAgIGlmIChtb3ZlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMudmFyaWFudCA9PT0gXCJzaG9naVwiKSBtb3ZlID0gdXNpMnVjaShtb3ZlKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMudmFyaWFudCA9PT0gXCJncmFuZFwiIHx8IHRoaXMudmFyaWFudCA9PT0gXCJncmFuZGhvdXNlXCIpIG1vdmUgPSBncmFuZDJ6ZXJvKG1vdmUpO1xyXG4gICAgICAgICAgICBtb3ZlID0gbW92ZS5zbGljZSgxLCAyKSA9PT0gJ0AnID8gW21vdmUuc2xpY2UoMiwgNCldIDogW21vdmUuc2xpY2UoMCwgMiksIG1vdmUuc2xpY2UoMiwgNCldO1xyXG4gICAgICAgICAgICBjYXB0dXJlID0gdGhpcy5jaGVzc2dyb3VuZC5zdGF0ZS5waWVjZXNbbW92ZVttb3ZlLmxlbmd0aCAtIDFdXSAhPT0gdW5kZWZpbmVkO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jaGVzc2dyb3VuZC5zZXQoe1xyXG4gICAgICAgICAgICBmZW46IHN0ZXAuZmVuLFxyXG4gICAgICAgICAgICB0dXJuQ29sb3I6IHN0ZXAudHVybkNvbG9yLFxyXG4gICAgICAgICAgICBtb3ZhYmxlOiB7XHJcbiAgICAgICAgICAgICAgICBmcmVlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIGNvbG9yOiB0aGlzLnNwZWN0YXRvciA/IHVuZGVmaW5lZCA6IHN0ZXAudHVybkNvbG9yLFxyXG4gICAgICAgICAgICAgICAgZGVzdHM6IHRoaXMucmVzdWx0ID09PSBcIlwiICYmIHBseSA9PT0gdGhpcy5zdGVwcy5sZW5ndGggLSAxID8gdGhpcy5kZXN0cyA6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGNoZWNrOiBzdGVwLmNoZWNrLFxyXG4gICAgICAgICAgICBsYXN0TW92ZTogbW92ZSxcclxuICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLmZ1bGxmZW4gPSBzdGVwLmZlbjtcclxuICAgICAgICB1cGRhdGVQb2NrZXRzKHRoaXMsIHRoaXMudnBvY2tldDAsIHRoaXMudnBvY2tldDEpO1xyXG5cclxuICAgICAgICBpZiAocGx5ID09PSB0aGlzLnBseSArIDEpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMudmFyaWFudCA9PT0gXCJzaG9naVwiKSB7XHJcbiAgICAgICAgICAgICAgICBzb3VuZC5zaG9naW1vdmUoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmIChjYXB0dXJlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc291bmQuY2FwdHVyZSgpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBzb3VuZC5tb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5wbHkgPSBwbHlcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGRvU2VuZCA9IChtZXNzYWdlKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCItLS0+IGRvU2VuZCgpOlwiLCBtZXNzYWdlKTtcclxuICAgICAgICB0aGlzLnNvY2suc2VuZChKU09OLnN0cmluZ2lmeShtZXNzYWdlKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzZW5kTW92ZSA9IChvcmlnLCBkZXN0LCBwcm9tbykgPT4ge1xyXG4gICAgICAgIC8vIHBhdXNlKCkgd2lsbCBhZGQgaW5jcmVtZW50IVxyXG4gICAgICAgIGNvbnN0IG9wcGNsb2NrID0gIXRoaXMuZmxpcCA/IDAgOiAxXHJcbiAgICAgICAgY29uc3QgbXljbG9jayA9IDEgLSBvcHBjbG9jaztcclxuICAgICAgICBjb25zdCBtb3ZldGltZSA9ICh0aGlzLmNsb2Nrc1tteWNsb2NrXS5ydW5uaW5nKSA/IERhdGUubm93KCkgLSB0aGlzLmNsb2Nrc1tteWNsb2NrXS5zdGFydFRpbWUgOiAwO1xyXG4gICAgICAgIHRoaXMuY2xvY2tzW215Y2xvY2tdLnBhdXNlKCh0aGlzLmJhc2UgPT09IDAgJiYgdGhpcy5wbHkgPCAyKSA/IGZhbHNlIDogdHJ1ZSk7XHJcbiAgICAgICAgLy8gY29uc29sZS5sb2coXCJzZW5kTW92ZShvcmlnLCBkZXN0LCBwcm9tKVwiLCBvcmlnLCBkZXN0LCBwcm9tbyk7XHJcbiAgICAgICAgY29uc3QgdWNpX21vdmUgPSBvcmlnICsgZGVzdCArIHByb21vO1xyXG4gICAgICAgIGNvbnN0IG1vdmUgPSB0aGlzLnZhcmlhbnQgPT09IFwic2hvZ2lcIiA/IHVjaTJ1c2kodWNpX21vdmUpIDogKHRoaXMudmFyaWFudCA9PT0gXCJncmFuZFwiIHx8IHRoaXMudmFyaWFudCA9PT0gXCJncmFuZGhvdXNlXCIpID8gemVybzJncmFuZCh1Y2lfbW92ZSkgOiB1Y2lfbW92ZTtcclxuICAgICAgICAvLyBjb25zb2xlLmxvZyhcInNlbmRNb3ZlKG1vdmUpXCIsIG1vdmUpO1xyXG4gICAgICAgIC8vIFRPRE86IGlmIHByZW1vdmVkLCBzZW5kIDAgdGltZVxyXG4gICAgICAgIGxldCBiY2xvY2ssIGNsb2NrcztcclxuICAgICAgICBpZiAoIXRoaXMuZmxpcCkge1xyXG4gICAgICAgICAgICBiY2xvY2sgPSB0aGlzLm15Y29sb3IgPT09IFwiYmxhY2tcIiA/IDEgOiAwO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGJjbG9jayA9IHRoaXMubXljb2xvciA9PT0gXCJibGFja1wiID8gMCA6IDE7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IHdjbG9jayA9IDEgLSBiY2xvY2tcclxuICAgICAgICBjbG9ja3MgPSB7bW92ZXRpbWU6IG1vdmV0aW1lLCBibGFjazogdGhpcy5jbG9ja3NbYmNsb2NrXS5kdXJhdGlvbiwgd2hpdGU6IHRoaXMuY2xvY2tzW3djbG9ja10uZHVyYXRpb259O1xyXG4gICAgICAgIHRoaXMuZG9TZW5kKHsgdHlwZTogXCJtb3ZlXCIsIGdhbWVJZDogdGhpcy5tb2RlbFtcImdhbWVJZFwiXSwgbW92ZTogbW92ZSwgY2xvY2tzOiBjbG9ja3MgfSk7XHJcbiAgICAgICAgaWYgKCF0aGlzLmFib3J0YWJsZSkgdGhpcy5jbG9ja3Nbb3BwY2xvY2tdLnN0YXJ0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbk1vdmUgPSAoKSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIChvcmlnLCBkZXN0LCBjYXB0dXJlZFBpZWNlKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiICAgZ3JvdW5kLm9uTW92ZSgpXCIsIG9yaWcsIGRlc3QsIGNhcHR1cmVkUGllY2UpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy52YXJpYW50ID09PSBcInNob2dpXCIpIHtcclxuICAgICAgICAgICAgICAgIHNvdW5kLnNob2dpbW92ZSgpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKGNhcHR1cmVkUGllY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICBzb3VuZC5jYXB0dXJlKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHNvdW5kLm1vdmUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uRHJvcCA9ICgpID0+IHtcclxuICAgICAgICByZXR1cm4gKHBpZWNlLCBkZXN0KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ3JvdW5kLm9uRHJvcCgpXCIsIHBpZWNlLCBkZXN0KTtcclxuICAgICAgICAgICAgaWYgKGRlc3QgIT0gJ3owJyAmJiBwaWVjZS5yb2xlICYmIGRyb3BJc1ZhbGlkKHRoaXMuZGVzdHMsIHBpZWNlLnJvbGUsIGRlc3QpKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy52YXJpYW50ID09PSBcInNob2dpXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICBzb3VuZC5zaG9naW1vdmUoKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc291bmQubW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbGlja0Ryb3AgPSBwaWVjZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHNldFByZW1vdmUgPSAob3JpZywgZGVzdCwgbWV0YSkgPT4ge1xyXG4gICAgICAgIHRoaXMucHJlbW92ZSA9IHsgb3JpZywgZGVzdCwgbWV0YSB9O1xyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwic2V0UHJlbW92ZSgpIHRvOlwiLCBvcmlnLCBkZXN0LCBtZXRhKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHVuc2V0UHJlbW92ZSA9ICgpID0+IHtcclxuICAgICAgICB0aGlzLnByZW1vdmUgPSBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2V0UHJlZHJvcCA9IChyb2xlLCBrZXkpID0+IHtcclxuICAgICAgICB0aGlzLnByZWRyb3AgPSB7IHJvbGUsIGtleSB9O1xyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwic2V0UHJlZHJvcCgpIHRvOlwiLCByb2xlLCBrZXkpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdW5zZXRQcmVkcm9wID0gKCkgPT4ge1xyXG4gICAgICAgIHRoaXMucHJlZHJvcCA9IG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBwZXJmb3JtUHJlbW92ZSA9ICgpID0+IHtcclxuICAgICAgICBjb25zdCB7IG9yaWcsIGRlc3QsIG1ldGEgfSA9IHRoaXMucHJlbW92ZTtcclxuICAgICAgICAvLyBUT0RPOiBwcm9tb3Rpb24/XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJwZXJmb3JtUHJlbW92ZSgpXCIsIG9yaWcsIGRlc3QsIG1ldGEpO1xyXG4gICAgICAgIHRoaXMuY2hlc3Nncm91bmQucGxheVByZW1vdmUoKTtcclxuICAgICAgICB0aGlzLnByZW1vdmUgPSBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcGVyZm9ybVByZWRyb3AgPSAoKSA9PiB7XHJcbiAgICAgICAgY29uc3QgeyByb2xlLCBrZXkgfSA9IHRoaXMucHJlZHJvcDtcclxuICAgICAgICBjb25zb2xlLmxvZyhcInBlcmZvcm1QcmVkcm9wKClcIiwgcm9sZSwga2V5KTtcclxuICAgICAgICB0aGlzLmNoZXNzZ3JvdW5kLnBsYXlQcmVkcm9wKGRyb3AgPT4geyByZXR1cm4gZHJvcElzVmFsaWQodGhpcy5kZXN0cywgZHJvcC5yb2xlLCBkcm9wLmtleSk7IH0pO1xyXG4gICAgICAgIHRoaXMucHJlZHJvcCA9IG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblVzZXJNb3ZlID0gKG9yaWcsIGRlc3QsIG1ldGEpID0+IHtcclxuICAgICAgICAvLyBjaGVzc2dyb3VuZCBkb2Vzbid0IGtub3dzIGFib3V0IGVwLCBzbyB3ZSBoYXZlIHRvIHJlbW92ZSBlcCBjYXB0dXJlZCBwYXduXHJcbiAgICAgICAgY29uc3QgcGllY2VzID0gdGhpcy5jaGVzc2dyb3VuZC5zdGF0ZS5waWVjZXM7XHJcbiAgICAgICAgY29uc3QgZ2VvbSA9IHRoaXMuY2hlc3Nncm91bmQuc3RhdGUuZ2VvbWV0cnk7XHJcbiAgICAgICAgLy8gY29uc29sZS5sb2coXCJncm91bmQub25Vc2VyTW92ZSgpXCIsIG9yaWcsIGRlc3QsIG1ldGEsIHBpZWNlcyk7XHJcbiAgICAgICAgY29uc3QgbW92ZWQgPSBwaWVjZXNbZGVzdF0gYXMgUGllY2U7XHJcbiAgICAgICAgY29uc3QgZmlyc3RSYW5rSXMwID0gdGhpcy5jaGVzc2dyb3VuZC5zdGF0ZS5kaW1lbnNpb25zLmhlaWdodCA9PT0gMTA7XHJcbiAgICAgICAgaWYgKG1ldGEuY2FwdHVyZWQgPT09IHVuZGVmaW5lZCAmJiBtb3ZlZC5yb2xlID09PSBcInBhd25cIiAmJiBvcmlnWzBdICE9IGRlc3RbMF0gJiYgaGFzRXAodGhpcy52YXJpYW50KSkge1xyXG4gICAgICAgICAgICBjb25zdCBwb3MgPSBrZXkycG9zKGRlc3QsIGZpcnN0UmFua0lzMCksXHJcbiAgICAgICAgICAgIHBhd25Qb3M6IFBvcyA9IFtwb3NbMF0sIHBvc1sxXSArICh0aGlzLm15Y29sb3IgPT09ICd3aGl0ZScgPyAtMSA6IDEpXTtcclxuICAgICAgICAgICAgY29uc3QgZGlmZjogUGllY2VzRGlmZiA9IHt9O1xyXG4gICAgICAgICAgICBkaWZmW3BvczJrZXkocGF3blBvcywgZ2VvbSldID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB0aGlzLmNoZXNzZ3JvdW5kLnNldFBpZWNlcyhkaWZmKTtcclxuICAgICAgICAgICAgbWV0YS5jYXB0dXJlZCA9IHtyb2xlOiBcInBhd25cIn07XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvLyBpbmNyZWFzZSBwb2NrZXQgY291bnRcclxuICAgICAgICBpZiAoKHRoaXMudmFyaWFudCA9PT0gXCJjcmF6eWhvdXNlXCIgfHwgdGhpcy52YXJpYW50ID09PSBcImNhcGFob3VzZVwiIHx8IHRoaXMudmFyaWFudCA9PT0gXCJzaG91c2VcIiB8fCB0aGlzLnZhcmlhbnQgPT09IFwiZ3JhbmRob3VzZVwiIHx8IHRoaXMudmFyaWFudCA9PT0gXCJzaG9naVwiKSAmJiBtZXRhLmNhcHR1cmVkKSB7XHJcbiAgICAgICAgICAgIHZhciByb2xlID0gbWV0YS5jYXB0dXJlZC5yb2xlXHJcbiAgICAgICAgICAgIGlmIChtZXRhLmNhcHR1cmVkLnByb21vdGVkKSByb2xlID0gdGhpcy52YXJpYW50ID09PSBcInNob2dpXCIgPyBtZXRhLmNhcHR1cmVkLnJvbGUuc2xpY2UoMSkgYXMgUm9sZSA6IFwicGF3blwiO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuZmxpcCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wb2NrZXRzWzBdW3JvbGVdKys7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnZwb2NrZXQwID0gcGF0Y2godGhpcy52cG9ja2V0MCwgcG9ja2V0Vmlldyh0aGlzLCB0aGlzLm15Y29sb3IsIFwidG9wXCIpKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucG9ja2V0c1sxXVtyb2xlXSsrO1xyXG4gICAgICAgICAgICAgICAgdGhpcy52cG9ja2V0MSA9IHBhdGNoKHRoaXMudnBvY2tldDEsIHBvY2tldFZpZXcodGhpcywgdGhpcy5teWNvbG9yLCBcImJvdHRvbVwiKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyAgZ2F0aW5nIGVsZXBoYW50L2hhd2tcclxuICAgICAgICBpZiAodGhpcy52YXJpYW50ID09PSBcInNlaXJhd2FuXCIgfHwgdGhpcy52YXJpYW50ID09PSBcInNob3VzZVwiKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5wcm9tb3Rpb24uc3RhcnQob3JpZywgZGVzdCwgbWV0YSkgJiYgIXRoaXMuZ2F0aW5nLnN0YXJ0KHRoaXMuZnVsbGZlbiwgb3JpZywgZGVzdCwgbWV0YSkpIHRoaXMuc2VuZE1vdmUob3JpZywgZGVzdCwgJycpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5wcm9tb3Rpb24uc3RhcnQob3JpZywgZGVzdCwgbWV0YSkpIHRoaXMuc2VuZE1vdmUob3JpZywgZGVzdCwgJycpO1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblVzZXJEcm9wID0gKHJvbGUsIGRlc3QpID0+IHtcclxuICAgICAgICAvLyBjb25zb2xlLmxvZyhcImdyb3VuZC5vblVzZXJEcm9wKClcIiwgcm9sZSwgZGVzdCk7XHJcbiAgICAgICAgLy8gZGVjcmVhc2UgcG9ja2V0IGNvdW50XHJcbiAgICAgICAgLy9jYW5jZWxEcm9wTW9kZSh0aGlzLmNoZXNzZ3JvdW5kLnN0YXRlKTtcclxuICAgICAgICBpZiAoZHJvcElzVmFsaWQodGhpcy5kZXN0cywgcm9sZSwgZGVzdCkpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuZmxpcCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wb2NrZXRzWzBdW3JvbGVdLS07XHJcbiAgICAgICAgICAgICAgICB0aGlzLnZwb2NrZXQwID0gcGF0Y2godGhpcy52cG9ja2V0MCwgcG9ja2V0Vmlldyh0aGlzLCB0aGlzLm15Y29sb3IsIFwidG9wXCIpKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucG9ja2V0c1sxXVtyb2xlXS0tO1xyXG4gICAgICAgICAgICAgICAgdGhpcy52cG9ja2V0MSA9IHBhdGNoKHRoaXMudnBvY2tldDEsIHBvY2tldFZpZXcodGhpcywgdGhpcy5teWNvbG9yLCBcImJvdHRvbVwiKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5zZW5kTW92ZShyb2xlVG9TYW5bcm9sZV0gKyBcIkBcIiwgZGVzdCwgJycpXHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwic2VudCBtb3ZlXCIsIG1vdmUpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiISEhIGludmFsaWQgbW92ZSAhISFcIiwgcm9sZSwgZGVzdCk7XHJcbiAgICAgICAgICAgIC8vIHJlc3RvcmUgYm9hcmRcclxuICAgICAgICAgICAgdGhpcy5jbGlja0Ryb3AgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuY2hlc3Nncm91bmQuc2V0KHtcclxuICAgICAgICAgICAgICAgIGZlbjogdGhpcy5mdWxsZmVuLFxyXG4gICAgICAgICAgICAgICAgbGFzdE1vdmU6IHRoaXMubGFzdG1vdmUsXHJcbiAgICAgICAgICAgICAgICB0dXJuQ29sb3I6IHRoaXMubXljb2xvcixcclxuICAgICAgICAgICAgICAgIG1vdmFibGU6IHtcclxuICAgICAgICAgICAgICAgICAgICBkZXN0czogdGhpcy5kZXN0cyxcclxuICAgICAgICAgICAgICAgICAgICBzaG93RGVzdHM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblNlbGVjdCA9IChzZWxlY3RlZCkgPT4ge1xyXG4gICAgICAgIHJldHVybiAoa2V5KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ3JvdW5kLm9uU2VsZWN0KClcIiwga2V5LCBzZWxlY3RlZCwgdGhpcy5jbGlja0Ryb3AsIHRoaXMuY2hlc3Nncm91bmQuc3RhdGUpO1xyXG4gICAgICAgICAgICAvLyBJZiBkcm9wIHNlbGVjdGlvbiB3YXMgc2V0IGRyb3BEZXN0cyB3ZSBoYXZlIHRvIHJlc3RvcmUgZGVzdHMgaGVyZVxyXG4gICAgICAgICAgICBpZiAodGhpcy5jaGVzc2dyb3VuZC5zdGF0ZS5tb3ZhYmxlLmRlc3RzID09PSB1bmRlZmluZWQpIHJldHVybjtcclxuICAgICAgICAgICAgaWYgKGtleSAhPSAnejAnICYmICd6MCcgaW4gdGhpcy5jaGVzc2dyb3VuZC5zdGF0ZS5tb3ZhYmxlLmRlc3RzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jbGlja0Ryb3AgIT09IHVuZGVmaW5lZCAmJiBkcm9wSXNWYWxpZCh0aGlzLmRlc3RzLCB0aGlzLmNsaWNrRHJvcC5yb2xlLCBrZXkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGVzc2dyb3VuZC5uZXdQaWVjZSh0aGlzLmNsaWNrRHJvcCwga2V5KTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uVXNlckRyb3AodGhpcy5jbGlja0Ryb3Aucm9sZSwga2V5KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoaXMuY2xpY2tEcm9wID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgLy9jYW5jZWxEcm9wTW9kZSh0aGlzLmNoZXNzZ3JvdW5kLnN0YXRlKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2hlc3Nncm91bmQuc2V0KHsgbW92YWJsZTogeyBkZXN0czogdGhpcy5kZXN0cyB9fSk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIC8vIFNpdHR1eWluIGluIHBsYWNlIHByb21vdGlvbiBvbiBDdHJsK2NsaWNrXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNoZXNzZ3JvdW5kLnN0YXRlLnN0YXRzLmN0cmxLZXkgJiYgXHJcbiAgICAgICAgICAgICAgICAoa2V5IGluIHRoaXMuY2hlc3Nncm91bmQuc3RhdGUubW92YWJsZS5kZXN0cykgJiZcclxuICAgICAgICAgICAgICAgICh0aGlzLmNoZXNzZ3JvdW5kLnN0YXRlLm1vdmFibGUuZGVzdHNba2V5XS5pbmRleE9mKGtleSkgPj0gMCkgJiZcclxuICAgICAgICAgICAgICAgICh0aGlzLnZhcmlhbnQgPT09ICdzaXR0dXlpbicpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkN0cmwgaW4gcGxhY2UgcHJvbW90aW9uXCIsIGtleSk7XHJcbiAgICAgICAgICAgICAgICB2YXIgcGllY2VzID0ge307XHJcbiAgICAgICAgICAgICAgICB2YXIgcGllY2UgPSB0aGlzLmNoZXNzZ3JvdW5kLnN0YXRlLnBpZWNlc1trZXldO1xyXG4gICAgICAgICAgICAgICAgcGllY2VzW2tleV0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IHBpZWNlIS5jb2xvcixcclxuICAgICAgICAgICAgICAgICAgICByb2xlOiAnZmVyeicsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvbW90ZWQ6IHRydWVcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNoZXNzZ3JvdW5kLnNldFBpZWNlcyhwaWVjZXMpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZW5kTW92ZShrZXksIGtleSwgJ2YnKTtcclxuXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25Nc2dVc2VyQ29ubmVjdGVkID0gKG1zZykgPT4ge1xyXG4gICAgICAgIHRoaXMubW9kZWxbXCJ1c2VybmFtZVwiXSA9IG1zZ1tcInVzZXJuYW1lXCJdO1xyXG4gICAgICAgIHJlbmRlclVzZXJuYW1lKHRoaXMubW9kZWxbXCJob21lXCJdLCB0aGlzLm1vZGVsW1widXNlcm5hbWVcIl0pO1xyXG4gICAgICAgIGlmICh0aGlzLnNwZWN0YXRvcikge1xyXG4gICAgICAgICAgICB0aGlzLmRvU2VuZCh7IHR5cGU6IFwiaXNfdXNlcl9vbmxpbmVcIiwgdXNlcm5hbWU6IHRoaXMud3BsYXllciB9KTtcclxuICAgICAgICAgICAgdGhpcy5kb1NlbmQoeyB0eXBlOiBcImlzX3VzZXJfb25saW5lXCIsIHVzZXJuYW1lOiB0aGlzLmJwbGF5ZXIgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyB3ZSB3YW50IHRvIGtub3cgbGFzdE1vdmUgYW5kIGNoZWNrIHN0YXR1c1xyXG4gICAgICAgICAgICB0aGlzLmRvU2VuZCh7IHR5cGU6IFwiYm9hcmRcIiwgZ2FtZUlkOiB0aGlzLm1vZGVsW1wiZ2FtZUlkXCJdIH0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG9wcF9uYW1lID0gdGhpcy5tb2RlbFtcInVzZXJuYW1lXCJdID09PSB0aGlzLndwbGF5ZXIgPyB0aGlzLmJwbGF5ZXIgOiB0aGlzLndwbGF5ZXI7XHJcbiAgICAgICAgICAgIHRoaXMuZG9TZW5kKHsgdHlwZTogXCJpc191c2VyX29ubGluZVwiLCB1c2VybmFtZTogb3BwX25hbWUgfSk7XHJcblxyXG4gICAgICAgICAgICB2YXIgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BsYXllcjEnKSBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICAgICAgcGF0Y2goY29udGFpbmVyLCBoKCdpLXNpZGUub25saW5lI3BsYXllcjEnLCB7Y2xhc3M6IHtcImljb25cIjogdHJ1ZSwgXCJpY29uLW9ubGluZVwiOiB0cnVlLCBcImljb24tb2ZmbGluZVwiOiBmYWxzZX19KSk7XHJcblxyXG4gICAgICAgICAgICAvLyBwcmV2ZW50IHNlbmRpbmcgZ2FtZVN0YXJ0IG1lc3NhZ2Ugd2hlbiB1c2VyIGp1c3QgcmVjb25lY3RpbmdcclxuICAgICAgICAgICAgaWYgKG1zZy5wbHkgPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZG9TZW5kKHsgdHlwZTogXCJyZWFkeVwiLCBnYW1lSWQ6IHRoaXMubW9kZWxbXCJnYW1lSWRcIl0gfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5kb1NlbmQoeyB0eXBlOiBcImJvYXJkXCIsIGdhbWVJZDogdGhpcy5tb2RlbFtcImdhbWVJZFwiXSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbk1zZ1VzZXJPbmxpbmUgPSAobXNnKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2cobXNnKTtcclxuICAgICAgICBpZiAobXNnLnVzZXJuYW1lID09PSB0aGlzLnBsYXllcnNbMF0pIHtcclxuICAgICAgICAgICAgdmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbGF5ZXIwJykgYXMgSFRNTEVsZW1lbnQ7XHJcbiAgICAgICAgICAgIHBhdGNoKGNvbnRhaW5lciwgaCgnaS1zaWRlLm9ubGluZSNwbGF5ZXIwJywge2NsYXNzOiB7XCJpY29uXCI6IHRydWUsIFwiaWNvbi1vbmxpbmVcIjogdHJ1ZSwgXCJpY29uLW9mZmxpbmVcIjogZmFsc2V9fSkpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHZhciBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheWVyMScpIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgICAgICBwYXRjaChjb250YWluZXIsIGgoJ2ktc2lkZS5vbmxpbmUjcGxheWVyMScsIHtjbGFzczoge1wiaWNvblwiOiB0cnVlLCBcImljb24tb25saW5lXCI6IHRydWUsIFwiaWNvbi1vZmZsaW5lXCI6IGZhbHNlfX0pKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbk1zZ1VzZXJEaXNjb25uZWN0ZWQgPSAobXNnKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2cobXNnKTtcclxuICAgICAgICBpZiAobXNnLnVzZXJuYW1lID09PSB0aGlzLnBsYXllcnNbMF0pIHtcclxuICAgICAgICAgICAgdmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbGF5ZXIwJykgYXMgSFRNTEVsZW1lbnQ7XHJcbiAgICAgICAgICAgIHBhdGNoKGNvbnRhaW5lciwgaCgnaS1zaWRlLm9ubGluZSNwbGF5ZXIwJywge2NsYXNzOiB7XCJpY29uXCI6IHRydWUsIFwiaWNvbi1vbmxpbmVcIjogZmFsc2UsIFwiaWNvbi1vZmZsaW5lXCI6IHRydWV9fSkpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHZhciBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheWVyMScpIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgICAgICBwYXRjaChjb250YWluZXIsIGgoJ2ktc2lkZS5vbmxpbmUjcGxheWVyMScsIHtjbGFzczoge1wiaWNvblwiOiB0cnVlLCBcImljb24tb25saW5lXCI6IGZhbHNlLCBcImljb24tb2ZmbGluZVwiOiB0cnVlfX0pKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbk1zZ0NoYXQgPSAobXNnKSA9PiB7XHJcbiAgICAgICAgaWYgKG1zZy51c2VyICE9PSB0aGlzLm1vZGVsW1widXNlcm5hbWVcIl0pIGNoYXRNZXNzYWdlKG1zZy51c2VyLCBtc2cubWVzc2FnZSwgXCJyb3VuZGNoYXRcIik7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbk1zZ01vcmVUaW1lID0gKCkgPT4ge1xyXG4gICAgICAgIGNoYXRNZXNzYWdlKCcnLCB0aGlzLm15Y29sb3IgKyAnICsxNSBzZWNvbmRzJywgXCJyb3VuZGNoYXRcIik7XHJcbiAgICAgICAgdGhpcy5jbG9ja3NbMV0uc2V0VGltZSh0aGlzLmNsb2Nrc1sxXS5kdXJhdGlvbiArIDE1ICogMTAwMCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbk1zZ09mZmVyID0gKG1zZykgPT4ge1xyXG4gICAgICAgIGNoYXRNZXNzYWdlKFwiXCIsIG1zZy5tZXNzYWdlLCBcInJvdW5kY2hhdFwiKTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgcHJpdmF0ZSBvbk1lc3NhZ2UgPSAoZXZ0KSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCI8KysrIG9uTWVzc2FnZSgpOlwiLCBldnQuZGF0YSk7XHJcbiAgICAgICAgdmFyIG1zZyA9IEpTT04ucGFyc2UoZXZ0LmRhdGEpO1xyXG4gICAgICAgIHN3aXRjaCAobXNnLnR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBcImJvYXJkXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uTXNnQm9hcmQobXNnKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwiZ2FtZUVuZFwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5jaGVja1N0YXR1cyhtc2cpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJnYW1lU3RhcnRcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMub25Nc2dHYW1lU3RhcnQobXNnKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwiZ2FtZV91c2VyX2Nvbm5lY3RlZFwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5vbk1zZ1VzZXJDb25uZWN0ZWQobXNnKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwidXNlcl9vbmxpbmVcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMub25Nc2dVc2VyT25saW5lKG1zZyk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcInVzZXJfZGlzY29ubmVjdGVkXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uTXNnVXNlckRpc2Nvbm5lY3RlZChtc2cpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJyb3VuZGNoYXRcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMub25Nc2dDaGF0KG1zZyk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcIm5ld19nYW1lXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uTXNnTmV3R2FtZShtc2cpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJvZmZlclwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5vbk1zZ09mZmVyKG1zZyk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcIm1vcmV0aW1lXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uTXNnTW9yZVRpbWUoKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwidXBkYXRlVFZcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMub25Nc2dVcGRhdGVUVihtc2cpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuIiwiaW1wb3J0IHsgaW5pdCB9IGZyb20gXCJzbmFiYmRvbVwiO1xuaW1wb3J0IHsgVk5vZGUgfSBmcm9tICdzbmFiYmRvbS92bm9kZSc7XG5pbXBvcnQga2xhc3MgZnJvbSAnc25hYmJkb20vbW9kdWxlcy9jbGFzcyc7XG5pbXBvcnQgYXR0cmlidXRlcyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL2F0dHJpYnV0ZXMnO1xuaW1wb3J0IHByb3BlcnRpZXMgZnJvbSAnc25hYmJkb20vbW9kdWxlcy9wcm9wcyc7XG5pbXBvcnQgbGlzdGVuZXJzIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvZXZlbnRsaXN0ZW5lcnMnO1xuXG5jb25zdCBwYXRjaCA9IGluaXQoW2tsYXNzLCBhdHRyaWJ1dGVzLCBwcm9wZXJ0aWVzLCBsaXN0ZW5lcnNdKTtcblxuaW1wb3J0IGggZnJvbSAnc25hYmJkb20vaCc7XG5cbmltcG9ydCB7IGRpbWVuc2lvbnMgfSBmcm9tICdjaGVzc2dyb3VuZHgvdHlwZXMnO1xuaW1wb3J0IHsgdmFyaWFudHMsIFZBUklBTlRTIH0gZnJvbSAnLi9jaGVzcyc7XG5pbXBvcnQgeyBwb2NrZXRWaWV3IH0gZnJvbSAnLi9wb2NrZXQnO1xuaW1wb3J0IHsgbmVlZFBvY2tldHMgfSBmcm9tICcuL2NoZXNzJztcbmltcG9ydCB7IHBsYXllciB9IGZyb20gJy4vcGxheWVyJztcbmltcG9ydCBSb3VuZENvbnRyb2xsZXIgZnJvbSAnLi9yb3VuZEN0cmwnO1xuXG4vLyBUT0RPOiBhZGQgZGFyay9saWdodCB0aGVtZSBidXR0b25zIChpY29uLXN1bi1vL2ljb24tbW9vbi1vKVxuXG5leHBvcnQgZnVuY3Rpb24gY2hhbmdlQ1NTKGNzc0ZpbGUpIHtcbiAgICAvLyBjc3MgZmlsZSBpbmRleCBpbiB0ZW1wbGF0ZS5odG1sXG4gICAgdmFyIGNzc0xpbmtJbmRleCA9IDE7XG4gICAgaWYgKGNzc0ZpbGUuaW5jbHVkZXMoXCJ4aWFuZ3FpXCIpKSB7XG4gICAgICAgIGNzc0xpbmtJbmRleCA9IDM7XG4gICAgfSBlbHNlIGlmIChjc3NGaWxlLmluY2x1ZGVzKFwic2hvZ2lcIikpIHtcbiAgICAgICAgY3NzTGlua0luZGV4ID0gMjtcbiAgICB9IGVsc2UgaWYgKGNzc0ZpbGUuaW5jbHVkZXMoXCJjYXBhXCIpKSB7XG4gICAgICAgIGNzc0xpbmtJbmRleCA9IDQ7XG4gICAgfSBlbHNlIGlmIChjc3NGaWxlLmluY2x1ZGVzKFwibWFrcnVrXCIpKSB7XG4gICAgICAgIGNzc0xpbmtJbmRleCA9IDU7XG4gICAgfSBlbHNlIGlmIChjc3NGaWxlLmluY2x1ZGVzKFwic2l0dHV5aW5cIikpIHtcbiAgICAgICAgY3NzTGlua0luZGV4ID0gNjtcbiAgICB9IGVsc2UgaWYgKGNzc0ZpbGUuaW5jbHVkZXMoXCJzZWlyXCIpKSB7XG4gICAgICAgIGNzc0xpbmtJbmRleCA9IDc7XG4gICAgfSBlbHNlIGlmIChjc3NGaWxlLmluY2x1ZGVzKFwiOHg4XCIpKSB7XG4gICAgICAgIGNzc0xpbmtJbmRleCA9IDg7XG4gICAgfSBlbHNlIGlmIChjc3NGaWxlLmluY2x1ZGVzKFwiMTB4OFwiKSkge1xuICAgICAgICBjc3NMaW5rSW5kZXggPSA5O1xuICAgIH0gZWxzZSBpZiAoY3NzRmlsZS5pbmNsdWRlcyhcIjEweDEwXCIpKSB7XG4gICAgICAgIGNzc0xpbmtJbmRleCA9IDEwO1xuICAgIH0gZWxzZSBpZiAoY3NzRmlsZS5pbmNsdWRlcyhcIjl4OVwiKSkge1xuICAgICAgICBjc3NMaW5rSW5kZXggPSAxMTtcbiAgICB9IGVsc2UgaWYgKGNzc0ZpbGUuaW5jbHVkZXMoXCI5eDEwXCIpKSB7XG4gICAgICAgIGNzc0xpbmtJbmRleCA9IDEyO1xuICAgIH0gZWxzZSBpZiAoY3NzRmlsZS5pbmNsdWRlcyhcIm1ha3JiXCIpKSB7XG4gICAgICAgIGNzc0xpbmtJbmRleCA9IDEzO1xuICAgIH0gZWxzZSBpZiAoY3NzRmlsZS5pbmNsdWRlcyhcInNpdHRiXCIpKSB7XG4gICAgICAgIGNzc0xpbmtJbmRleCA9IDE0O1xuICAgIH1cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImxpbmtcIikuaXRlbShjc3NMaW5rSW5kZXgpIS5zZXRBdHRyaWJ1dGUoXCJocmVmXCIsIGNzc0ZpbGUpO1xufVxuXG5mdW5jdGlvbiBzZXRCb2FyZCAoQ1NTaW5kZXhlc0IsIHZhcmlhbnQsIGNvbG9yKSB7XG4gICAgY29uc29sZS5sb2coXCJzZXRCb2FyZCgpXCIsIENTU2luZGV4ZXNCLCB2YXJpYW50LCBjb2xvcilcbiAgICB2YXIgaWR4ID0gQ1NTaW5kZXhlc0JbdmFyaWFudHMuaW5kZXhPZih2YXJpYW50KV07XG4gICAgaWR4ID0gTWF0aC5taW4oaWR4LCBWQVJJQU5UU1t2YXJpYW50XS5Cb2FyZENTUy5sZW5ndGggLSAxKTtcbiAgICBjaGFuZ2VDU1MoJy9zdGF0aWMvJyArIFZBUklBTlRTW3ZhcmlhbnRdLkJvYXJkQ1NTW2lkeF0gKyAnLmNzcycpO1xufVxuXG5mdW5jdGlvbiBzZXRQaWVjZXMgKENTU2luZGV4ZXNQLCB2YXJpYW50LCBjb2xvcikge1xuICAgIGNvbnNvbGUubG9nKFwic2V0UGllY2VzKClcIiwgQ1NTaW5kZXhlc1AsIHZhcmlhbnQsIGNvbG9yKVxuICAgIHZhciBpZHggPSBDU1NpbmRleGVzUFt2YXJpYW50cy5pbmRleE9mKHZhcmlhbnQpXTtcbiAgICBpZHggPSBNYXRoLm1pbihpZHgsIFZBUklBTlRTW3ZhcmlhbnRdLlBpZWNlQ1NTLmxlbmd0aCAtIDEpO1xuICAgIGlmICh2YXJpYW50ID09PSBcInNob2dpXCIpIHtcbiAgICAgICAgdmFyIGNzcyA9IFZBUklBTlRTW3ZhcmlhbnRdLlBpZWNlQ1NTW2lkeF07XG4gICAgICAgIC8vIGNoYW5nZSBzaG9naSBwaWVjZSBjb2xvcnMgYWNjb3JkaW5nIHRvIGJvYXJkIG9yaWVudGF0aW9uXG4gICAgICAgIGlmIChjb2xvciA9PT0gXCJibGFja1wiKSBjc3MgPSBjc3MucmVwbGFjZSgnMCcsICcxJyk7XG4gICAgICAgIGNoYW5nZUNTUygnL3N0YXRpYy8nICsgY3NzICsgJy5jc3MnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjaGFuZ2VDU1MoJy9zdGF0aWMvJyArIFZBUklBTlRTW3ZhcmlhbnRdLlBpZWNlQ1NTW2lkeF0gKyAnLmNzcycpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gc2V0Wm9vbSAoY3RybCwgem9vbTogbnVtYmVyKSB7XG4gICAgY29uc3QgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuY2ctd3JhcCcpIGFzIEhUTUxFbGVtZW50O1xuICAgIGlmIChlbCkge1xuICAgICAgICBjb25zdCBiYXNlV2lkdGggPSBkaW1lbnNpb25zW1ZBUklBTlRTW2N0cmwudmFyaWFudF0uZ2VvbV0ud2lkdGggKiAoY3RybC52YXJpYW50ID09PSBcInNob2dpXCIgPyA1MiA6IDY0KTtcbiAgICAgICAgY29uc3QgYmFzZUhlaWdodCA9IGRpbWVuc2lvbnNbVkFSSUFOVFNbY3RybC52YXJpYW50XS5nZW9tXS5oZWlnaHQgKiAoY3RybC52YXJpYW50ID09PSBcInNob2dpXCIgPyA2MCA6IDY0KTtcbiAgICAgICAgY29uc3QgcHh3ID0gYCR7em9vbSAvIDEwMCAqIGJhc2VXaWR0aH1weGA7XG4gICAgICAgIGNvbnN0IHB4aCA9IGAke3pvb20gLyAxMDAgKiBiYXNlSGVpZ2h0fXB4YDtcbiAgICAgICAgZWwuc3R5bGUud2lkdGggPSBweHc7XG4gICAgICAgIGVsLnN0eWxlLmhlaWdodCA9IHB4aDtcbiAgICAgICAgdmFyIHB4cCA9IChuZWVkUG9ja2V0cyhjdHJsLnZhcmlhbnQpKSA/ICcxMzJweDsnIDogJzBweDsnO1xuICAgICAgICBpZiAoY3RybCBpbnN0YW5jZW9mIFJvdW5kQ29udHJvbGxlcikge1xuICAgICAgICAgICAgcHhwID0gJzUwMHB4Oyc7XG4gICAgICAgIH1cbiAgICAgICAgZG9jdW1lbnQuYm9keS5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJy0tY2d3cmFwd2lkdGg6JyArIHB4dyArICc7LS1jZ3dyYXBoZWlnaHQ6JyArIHB4aCArICc7LS1wb2NrZXRoZWlnaHQ6JyArIHB4cCk7XG5cbiAgICAgICAgZG9jdW1lbnQuYm9keS5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnY2hlc3Nncm91bmQucmVzaXplJykpO1xuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInpvb20tXCIgKyBjdHJsLnZhcmlhbnQsIFN0cmluZyh6b29tKSk7XG4gICAgfVxufVxuXG4vLyBmbGlwXG5leHBvcnQgZnVuY3Rpb24gdG9nZ2xlT3JpZW50YXRpb24gKGN0cmwpIHtcbiAgICBjdHJsLmZsaXAgPSAhY3RybC5mbGlwO1xuICAgIGN0cmwuY2hlc3Nncm91bmQudG9nZ2xlT3JpZW50YXRpb24oKTtcblxuICAgIGlmIChjdHJsLnZhcmlhbnQgPT09IFwic2hvZ2lcIikge1xuICAgICAgICBjb25zdCBjb2xvciA9IGN0cmwuY2hlc3Nncm91bmQuc3RhdGUub3JpZW50YXRpb24gPT09IFwid2hpdGVcIiA/IFwid2hpdGVcIiA6IFwiYmxhY2tcIjtcbiAgICAgICAgc2V0UGllY2VzKGN0cmwuQ1NTaW5kZXhlc1AsIGN0cmwudmFyaWFudCwgY29sb3IpO1xuICAgIH07XG4gICAgXG4gICAgY29uc29sZS5sb2coXCJGTElQXCIpO1xuICAgIGlmIChuZWVkUG9ja2V0cyhjdHJsLnZhcmlhbnQpKSB7XG4gICAgICAgIGNvbnN0IHRtcF9wb2NrZXQgPSBjdHJsLnBvY2tldHNbMF07XG4gICAgICAgIGN0cmwucG9ja2V0c1swXSA9IGN0cmwucG9ja2V0c1sxXTtcbiAgICAgICAgY3RybC5wb2NrZXRzWzFdID0gdG1wX3BvY2tldDtcbiAgICAgICAgY3RybC52cG9ja2V0MCA9IHBhdGNoKGN0cmwudnBvY2tldDAsIHBvY2tldFZpZXcoY3RybCwgY3RybC5mbGlwID8gY3RybC5teWNvbG9yIDogY3RybC5vcHBjb2xvciwgXCJ0b3BcIikpO1xuICAgICAgICBjdHJsLnZwb2NrZXQxID0gcGF0Y2goY3RybC52cG9ja2V0MSwgcG9ja2V0VmlldyhjdHJsLCBjdHJsLmZsaXAgPyBjdHJsLm9wcGNvbG9yIDogY3RybC5teWNvbG9yLCBcImJvdHRvbVwiKSk7XG4gICAgfVxuXG4gICAgLy8gVE9ETzogbW9yZXRpbWUgYnV0dG9uXG4gICAgY29uc3QgbmV3X3J1bm5pbmdfY2xjayA9IChjdHJsLmNsb2Nrc1swXS5ydW5uaW5nKSA/IGN0cmwuY2xvY2tzWzFdIDogY3RybC5jbG9ja3NbMF07XG4gICAgY3RybC5jbG9ja3NbMF0ucGF1c2UoZmFsc2UpO1xuICAgIGN0cmwuY2xvY2tzWzFdLnBhdXNlKGZhbHNlKTtcblxuICAgIGNvbnN0IHRtcF9jbG9jayA9IGN0cmwuY2xvY2tzWzBdO1xuICAgIGNvbnN0IHRtcF9jbG9ja190aW1lID0gdG1wX2Nsb2NrLmR1cmF0aW9uO1xuICAgIGN0cmwuY2xvY2tzWzBdLnNldFRpbWUoY3RybC5jbG9ja3NbMV0uZHVyYXRpb24pO1xuICAgIGN0cmwuY2xvY2tzWzFdLnNldFRpbWUodG1wX2Nsb2NrX3RpbWUpO1xuICAgIGlmIChjdHJsLnN0YXR1cyA8IDApIG5ld19ydW5uaW5nX2NsY2suc3RhcnQoKTtcblxuICAgIGN0cmwudnBsYXllcjAgPSBwYXRjaChjdHJsLnZwbGF5ZXIwLCBwbGF5ZXIoJ3BsYXllcjAnLCBjdHJsLnRpdGxlc1tjdHJsLmZsaXAgPyAxIDogMF0sIGN0cmwucGxheWVyc1tjdHJsLmZsaXAgPyAxIDogMF0sIGN0cmwubW9kZWxbXCJsZXZlbFwiXSkpO1xuICAgIGN0cmwudnBsYXllcjEgPSBwYXRjaChjdHJsLnZwbGF5ZXIxLCBwbGF5ZXIoJ3BsYXllcjEnLCBjdHJsLnRpdGxlc1tjdHJsLmZsaXAgPyAwIDogMV0sIGN0cmwucGxheWVyc1tjdHJsLmZsaXAgPyAwIDogMV0sIGN0cmwubW9kZWxbXCJsZXZlbFwiXSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2VhckJ1dHRvbiAoY3RybCkge1xuICAgIHJldHVybiBoKCdidXR0b24jZ2VhcicsIHtcbiAgICAgICAgb246IHsgY2xpY2s6ICgpID0+IHRvZ2dsZUJvYXJkU2V0dGluZ3MoY3RybCkgfSxcbiAgICAgICAgY2xhc3M6IHtcInNlbGVjdGVkXCI6IGN0cmwuc2V0dGluZ3N9IH0sXG4gICAgICAgIFtoKCdpJywge1xuICAgICAgICAgICAgcHJvcHM6IHt0aXRsZTogJ1NldHRpbmdzJ30sXG4gICAgICAgICAgICBjbGFzczoge1wiaWNvblwiOiB0cnVlLCBcImljb24tY29nXCI6IHRydWV9IFxuICAgICAgICAgICAgfVxuICAgICAgICApXSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvZ2dsZUJvYXJkU2V0dGluZ3MgKGN0cmwpIHtcbiAgICBjdHJsLnNldHRpbmdzID0gIWN0cmwuc2V0dGluZ3M7XG4gICAgY29uc3QgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2VhcicpO1xuICAgIGlmIChlbCBpbnN0YW5jZW9mIEVsZW1lbnQpIHBhdGNoKGN0cmwudmdlYXIsIGdlYXJCdXR0b24oY3RybCkpO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtb3ZlbGlzdC1ibG9jaycpIS5zdHlsZS5kaXNwbGF5ID0gKGN0cmwuc2V0dGluZ3MpID8gJ25vbmUnIDogJ2lubGluZS1ncmlkJztcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYm9hcmQtc2V0dGluZ3MnKSEuc3R5bGUuZGlzcGxheSA9IChjdHJsLnNldHRpbmdzKSA/ICdpbmxpbmUtZ3JpZCc6ICdub25lJztcbn1cblxuZnVuY3Rpb24gcmVuZGVyQm9hcmRzIChjdHJsKSB7XG4gICAgY29uc3QgdmFyaWFudCA9IGN0cmwudmFyaWFudDtcbiAgICB2YXIgdmJvYXJkID0gY3RybC5DU1NpbmRleGVzQlt2YXJpYW50cy5pbmRleE9mKGN0cmwudmFyaWFudCldO1xuICAgIHZhciBpO1xuICAgIGNvbnN0IGJvYXJkcyA6IFZOb2RlW10gPSBbXTtcblxuICAgIGNvbnN0IHRvZ2dsZUJvYXJkcyA9IChlKSA9PiB7XG4gICAgICAgIGNvbnN0IGlkeCA9IGUudGFyZ2V0LnZhbHVlO1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwidG9nZ2xlQm9hcmRzKClcIiwgaWR4KTtcbiAgICAgICAgY3RybC5DU1NpbmRleGVzQlt2YXJpYW50cy5pbmRleE9mKGN0cmwudmFyaWFudCldID0gaWR4XG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGN0cmwudmFyaWFudCArIFwiX2JvYXJkXCIsIFN0cmluZyhpZHgpKTtcbiAgICAgICAgc2V0Qm9hcmQoY3RybC5DU1NpbmRleGVzQiwgY3RybC52YXJpYW50LCBjdHJsLm15Y29sb3IpO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDA7IGkgPCBWQVJJQU5UU1tjdHJsLnZhcmlhbnRdLkJvYXJkQ1NTLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGJvYXJkcy5wdXNoKGgoJ2lucHV0I2JvYXJkJyArIFN0cmluZyhpKSwge1xuICAgICAgICAgICAgb246IHsgY2hhbmdlOiB0b2dnbGVCb2FyZHMgfSxcbiAgICAgICAgICAgIHByb3BzOiB7IHR5cGU6IFwicmFkaW9cIiwgbmFtZTogXCJib2FyZFwiLCB2YWx1ZTogU3RyaW5nKGkpLCBjaGVja2VkOiB2Ym9hcmQgPT09IFN0cmluZyhpKSA/IFwiY2hlY2tlZFwiIDogXCJcIn1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgICAgIGJvYXJkcy5wdXNoKGgoJ2xhYmVsLmJvYXJkLmJvYXJkJyArIFN0cmluZyhpKSArICcuJyArIHZhcmlhbnQsIHsgYXR0cnM6IHtmb3I6IFwiYm9hcmRcIiArIFN0cmluZyhpKX0gfSwgXCJcIikpO1xuICAgIH1cbiAgICByZXR1cm4gYm9hcmRzO1xufVxuXG5mdW5jdGlvbiByZW5kZXJQaWVjZXMgKGN0cmwpIHtcbiAgICBjb25zdCB2YXJpYW50ID0gY3RybC52YXJpYW50O1xuICAgIHZhciB2cGllY2UgPSBjdHJsLkNTU2luZGV4ZXNQW3ZhcmlhbnRzLmluZGV4T2YoY3RybC52YXJpYW50KV07XG4gICAgdmFyIGk7XG4gICAgY29uc3QgcGllY2VzIDogVk5vZGVbXSA9IFtdO1xuXG4gICAgY29uc3QgdG9nZ2xlUGllY2VzID0gKGUpID0+IHtcbiAgICAgICAgY29uc3QgaWR4ID0gZS50YXJnZXQudmFsdWU7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJ0b2dnbGVQaWVjZXMoKVwiLCBpZHgpO1xuICAgICAgICBjdHJsLkNTU2luZGV4ZXNQW3ZhcmlhbnRzLmluZGV4T2YoY3RybC52YXJpYW50KV0gPSBpZHhcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oY3RybC52YXJpYW50ICsgXCJfcGllY2VzXCIsIFN0cmluZyhpZHgpKTtcbiAgICAgICAgc2V0UGllY2VzKGN0cmwuQ1NTaW5kZXhlc1AsIGN0cmwudmFyaWFudCwgY3RybC5teWNvbG9yKTtcbiAgICB9XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgVkFSSUFOVFNbY3RybC52YXJpYW50XS5QaWVjZUNTUy5sZW5ndGg7IGkrKykge1xuICAgICAgICBwaWVjZXMucHVzaChoKCdpbnB1dCNwaWVjZScgKyBTdHJpbmcoaSksIHtcbiAgICAgICAgICAgIG9uOiB7IGNoYW5nZTogdG9nZ2xlUGllY2VzIH0sXG4gICAgICAgICAgICBwcm9wczogeyB0eXBlOiBcInJhZGlvXCIsIG5hbWU6IFwicGllY2VcIiwgdmFsdWU6IFN0cmluZyhpKSwgY2hlY2tlZDogdnBpZWNlID09PSBTdHJpbmcoaSkgPyBcImNoZWNrZWRcIiA6IFwiXCJ9XG4gICAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgICAgICBwaWVjZXMucHVzaChoKCdsYWJlbC5waWVjZS5waWVjZScgKyBTdHJpbmcoaSkgKyAnLicgKyB2YXJpYW50LCB7IGF0dHJzOiB7Zm9yOiBcInBpZWNlXCIgKyBTdHJpbmcoaSl9IH0sIFwiXCIpKTtcbiAgICB9XG4gICAgcmV0dXJuIHBpZWNlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldHRpbmdzVmlldyAoY3RybCkge1xuXG4gICAgaWYgKFZBUklBTlRTW2N0cmwudmFyaWFudF0uQm9hcmRDU1MubGVuZ3RoID4gMSkgc2V0Qm9hcmQoY3RybC5DU1NpbmRleGVzQiwgY3RybC52YXJpYW50LCBjdHJsLm15Y29sb3IpO1xuICAgIGlmIChWQVJJQU5UU1tjdHJsLnZhcmlhbnRdLlBpZWNlQ1NTLmxlbmd0aCA+IDEpIHNldFBpZWNlcyhjdHJsLkNTU2luZGV4ZXNQLCBjdHJsLnZhcmlhbnQsIGN0cmwubXljb2xvcik7XG5cbiAgICAvLyB0dXJuIHNldHRpbmdzIHBhbmVsIG9mZlxuICAgIHRvZ2dsZUJvYXJkU2V0dGluZ3MoY3RybCk7XG4gICAgY29uc3Qgem9vbSA9IGxvY2FsU3RvcmFnZVtcInpvb20tXCIgKyBjdHJsLnZhcmlhbnRdO1xuICAgIGlmICh6b29tICE9PSB1bmRlZmluZWQgJiYgem9vbSAhPT0gMTAwKSBzZXRab29tKGN0cmwsIE51bWJlcih6b29tKSk7XG5cbiAgICByZXR1cm4gaCgnZGl2I2JvYXJkLXNldHRpbmdzJywgW1xuICAgICAgICBoKCdkaXYuc2V0dGluZ3MtcGllY2VzJywgcmVuZGVyUGllY2VzKGN0cmwpKSxcbiAgICAgICAgaCgnZGl2LnNldHRpbmdzLWJvYXJkcycsIHJlbmRlckJvYXJkcyhjdHJsKSksXG4gICAgICAgIC8vIFRPRE86IGhvdyB0byBob3Jpem9udGFseSBjZW50ZXIgdGhpcz9cbiAgICAgICAgLy8gaCgnbGFiZWwuem9vbScsIHsgYXR0cnM6IHtmb3I6IFwiem9vbVwifSB9LCBcIkJvYXJkIHNpemVcIiksXG4gICAgICAgIGgoJ2lucHV0I3pvb20nLCB7XG4gICAgICAgICAgICBjbGFzczoge1wic2xpZGVyXCI6IHRydWUgfSxcbiAgICAgICAgICAgIGF0dHJzOiB7IG5hbWU6ICd6b29tJywgd2lkdGg6ICcyODBweCcsIHR5cGU6ICdyYW5nZScsIHZhbHVlOiBOdW1iZXIoem9vbSksIG1pbjogNjAsIG1heDogMTQwIH0sXG4gICAgICAgICAgICBvbjogeyBpbnB1dDogKGUpID0+IHsgc2V0Wm9vbShjdHJsLCBwYXJzZUZsb2F0KChlLnRhcmdldCBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZSkpOyB9IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKSxcbiAgICBdKTtcbn1cbiIsImNsYXNzIHNvdW5kcyB7XHJcbiAgICB0cmFja3M7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLnRyYWNrcyA9IHtcclxuICAgICAgICAgICAgR2VuZXJpY05vdGlmeTogeyBuYW1lOiAnR2VuZXJpY05vdGlmeScsIHF0eSA6IDEsIHBvb2wgOiBbXSwgaW5kZXggOiAwfSxcclxuICAgICAgICAgICAgTW92ZTogeyBuYW1lOiAnTW92ZScsIHF0eSA6IDYsIHBvb2wgOiBbXSwgaW5kZXggOiAwfSxcclxuICAgICAgICAgICAgQ2FwdHVyZTogeyBuYW1lOiAnQ2FwdHVyZScsIHF0eSA6IDQsIHBvb2wgOiBbXSwgaW5kZXggOiAwfSxcclxuICAgICAgICAgICAgQ2hlY2s6IHsgbmFtZTogJ0NoZWNrJywgcXR5IDogMiwgcG9vbCA6IFtdLCBpbmRleCA6IDB9LFxyXG4gICAgICAgICAgICBEcmF3OiB7IG5hbWU6ICdEcmF3JywgcXR5IDogMSwgcG9vbCA6IFtdLCBpbmRleCA6IDB9LFxyXG4gICAgICAgICAgICBWaWN0b3J5OiB7IG5hbWU6ICdWaWN0b3J5JywgcXR5IDogMSwgcG9vbCA6IFtdLCBpbmRleCA6IDB9LFxyXG4gICAgICAgICAgICBEZWZlYXQ6IHsgbmFtZTogJ0RlZmVhdCcsIHF0eSA6IDEsIHBvb2wgOiBbXSwgaW5kZXggOiAwfSxcclxuICAgICAgICAgICAgU2hvZ2lNb3ZlOiB7IG5hbWU6ICdrb21hb3RvNScsIHF0eSA6IDYsIHBvb2wgOiBbXSwgaW5kZXggOiAwfSxcclxuICAgICAgICAgICAgQ2hhdDogeyBuYW1lOiAnY2hhdCcsIHF0eSA6IDEsIHBvb2wgOiBbXSwgaW5kZXggOiAwfSxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIE9iamVjdC5rZXlzKHRoaXMudHJhY2tzKS5mb3JFYWNoKGtleSA9PiB7XHJcbiAgICAgICAgICAgIGxldCB0eXBlID0gdGhpcy50cmFja3Nba2V5XTtcclxuICAgICAgICAgICAgdHlwZS5wb29sID0gdGhpcy5idWlsZE1hbnlTb3VuZHModHlwZS5uYW1lLCB0eXBlLnF0eSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBidWlsZE1hbnlTb3VuZHMgPSAoZmlsZSwgcXR5KSA9PiB7XHJcbiAgICAgICAgdmFyIHNvdW5kQXJyYXk6IEhUTUxBdWRpb0VsZW1lbnRbXSA9IFtdO1xyXG4gICAgICAgIHdoaWxlIChzb3VuZEFycmF5Lmxlbmd0aCA8IHF0eSkge1xyXG4gICAgICAgICAgICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYXVkaW9cIik7XHJcbiAgICAgICAgICAgIGlmIChlbC5jYW5QbGF5VHlwZSgnYXVkaW8vbXBlZycpKSB7XHJcbiAgICAgICAgICAgICAgICBlbC5zcmMgPSAnL3N0YXRpYy9zb3VuZC8nICsgZmlsZSArICcubXAzJztcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGVsLnNyYyA9ICcvc3RhdGljL3NvdW5kLycgKyBmaWxlICsgJy5vZ2cnO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZShcInByZWxvYWRcIiwgXCJub25lXCIpO1xyXG4gICAgICAgICAgICBlbC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbiAgICAgICAgICAgIHNvdW5kQXJyYXkucHVzaChlbCk7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZWwpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gc291bmRBcnJheTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldFNvdW5kID0gKHR5cGUpID0+IHtcclxuICAgICAgICBsZXQgdGFyZ2V0ID0gdGhpcy50cmFja3NbdHlwZV07XHJcbiAgICAgICAgdGFyZ2V0LmluZGV4ID0gKHRhcmdldC5pbmRleCArIDEpICUgdGFyZ2V0LnBvb2wubGVuZ3RoO1xyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwiU09VTkQ6XCIsIHR5cGUsIHRhcmdldC5pbmRleCk7XHJcbiAgICAgICAgcmV0dXJuIHRhcmdldC5wb29sW3RhcmdldC5pbmRleF07XHJcbiAgICB9XHJcblxyXG4gICAgZ2VuZXJpY05vdGlmeSgpIHsgdGhpcy5nZXRTb3VuZCgnR2VuZXJpY05vdGlmeScpLnBsYXkoKTsgfTtcclxuICAgIG1vdmUoKSB7IHRoaXMuZ2V0U291bmQoJ01vdmUnKS5wbGF5KCk7IH07XHJcbiAgICBjYXB0dXJlKCkgeyB0aGlzLmdldFNvdW5kKCdDYXB0dXJlJykucGxheSgpOyB9O1xyXG4gICAgY2hlY2soKSB7IHRoaXMuZ2V0U291bmQoJ0NoZWNrJykucGxheSgpOyB9O1xyXG4gICAgZHJhdygpIHsgdGhpcy5nZXRTb3VuZCgnRHJhdycpLnBsYXkoKTsgfTtcclxuICAgIHZpY3RvcnkoKSB7IHRoaXMuZ2V0U291bmQoJ1ZpY3RvcnknKS5wbGF5KCk7IH07XHJcbiAgICBkZWZlYXQoKSB7IHRoaXMuZ2V0U291bmQoJ0RlZmVhdCcpLnBsYXkoKTsgfTtcclxuICAgIHNob2dpbW92ZSgpIHsgdGhpcy5nZXRTb3VuZCgnU2hvZ2lNb3ZlJykucGxheSgpOyB9O1xyXG4gICAgY2hhdCgpIHsgdGhpcy5nZXRTb3VuZCgnQ2hhdCcpLnBsYXkoKTsgfTtcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IHNvdW5kID0gbmV3KHNvdW5kcyk7XHJcbiIsImltcG9ydCB7IGluaXQgfSBmcm9tICdzbmFiYmRvbSc7XG5pbXBvcnQga2xhc3MgZnJvbSAnc25hYmJkb20vbW9kdWxlcy9jbGFzcyc7XG5pbXBvcnQgYXR0cmlidXRlcyBmcm9tICdzbmFiYmRvbS9tb2R1bGVzL2F0dHJpYnV0ZXMnO1xuaW1wb3J0IHByb3BlcnRpZXMgZnJvbSAnc25hYmJkb20vbW9kdWxlcy9wcm9wcyc7XG5pbXBvcnQgbGlzdGVuZXJzIGZyb20gJ3NuYWJiZG9tL21vZHVsZXMvZXZlbnRsaXN0ZW5lcnMnO1xuXG5jb25zdCBwYXRjaCA9IGluaXQoW2tsYXNzLCBhdHRyaWJ1dGVzLCBwcm9wZXJ0aWVzLCBsaXN0ZW5lcnNdKTtcblxuaW1wb3J0IGggZnJvbSAnc25hYmJkb20vaCc7XG5cbi8vIFRPRE86IGNyZWF0ZSBsb2dvdXQgYnV0dG9uIHdoZW4gbG9nZ2VkIGluXG4vKlxuZnVuY3Rpb24gbG9naW4oaG9tZSkge1xuICAgIGNvbnNvbGUubG9nKFwiTE9HSU4gV0lUSCBMSUNIRVNTXCIpO1xuICAgIHdpbmRvdy5sb2NhdGlvbi5hc3NpZ24oaG9tZSArICcvbG9naW4nKTtcbn07XG4qL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlclVzZXJuYW1lKGhvbWUsIHVzZXJuYW1lKSB7XG4gICAgY29uc29sZS5sb2coXCJyZW5kZXJVc2VybmFtZSgpXCIsIHVzZXJuYW1lLCBob21lKTtcbiAgICB2YXIgb2xkVk5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndXNlcm5hbWUnKTtcbiAgICBpZiAob2xkVk5vZGUgaW5zdGFuY2VvZiBFbGVtZW50KSB7XG4gICAgICAgIG9sZFZOb2RlLmlubmVySFRNTCA9ICcnO1xuICAgICAgICBwYXRjaChvbGRWTm9kZSBhcyBIVE1MRWxlbWVudCwgaCgnZGl2I3VzZXJuYW1lJywgaCgnYS5uYXYtbGluaycsIHthdHRyczoge2hyZWY6ICcvQC8nICsgdXNlcm5hbWV9fSwgdXNlcm5hbWUpKSk7XG4gICAgfTtcbi8qXG4gICAgLy8gaWYgdXNlcm5hbWUgaXMgbm90IGEgbG9nZ2VkIGluIG5hbWUgbG9naW4gZWxzZSBsb2dvdXQgYnV0dG9uXG4gICAgdmFyIG9sZFZOb2RlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvZ2luJyk7XG4gICAgaWYgKG9sZFZOb2RlIGluc3RhbmNlb2YgRWxlbWVudCkge1xuICAgICAgICBvbGRWTm9kZS5pbm5lckhUTUwgPSAnJztcbiAgICAgICAgcGF0Y2gob2xkVk5vZGUgYXMgSFRNTEVsZW1lbnQsIGgoJ2J1dHRvbicsIHsgb246IHsgY2xpY2s6ICgpID0+IGxvZ2luKGhvbWUpIH0sIHByb3BzOiB7dGl0bGU6ICdMb2dpbiB3aXRoIExpY2hlc3MnfSB9LCBbaCgnaScsIHtjbGFzczoge1wiaWNvblwiOiB0cnVlLCBcImljb24tc2lnbi1pblwiOiB0cnVlfSB9ICksIF0pKTtcbiAgICB9O1xuKi9cbn1cbiJdfQ==
