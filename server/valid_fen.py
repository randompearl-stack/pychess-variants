from const import LOOKING_GLASS_ALICE_FEN, MANCHU_FEN, MANCHU_R_FEN
from fairy import STANDARD_FEN


VALID_FEN = {
    "alice": (LOOKING_GLASS_ALICE_FEN,),
    "fogofwar": (STANDARD_FEN,),
    "capablanca": (
        "rnbcqkabnr/pppppppppp/10/10/10/10/PPPPPPPPPP/RNBCQKABNR w KQkq - 0 1",  # Bird
        "ranbqkbncr/pppppppppp/10/10/10/10/PPPPPPPPPP/RANBQKBNCR w KQkq - 0 1",  # Carrera
        "arnbqkbnrc/pppppppppp/10/10/10/10/PPPPPPPPPP/ARNBQKBNRC w KQkq - 0 1",  # Conservative
        "rnbqkcabnr/pppppppppp/10/10/10/10/PPPPPPPPPP/RNBQKCABNR w KQkq - 0 1",  # Embassy
        "rnbqckabnr/pppppppppp/10/10/10/10/PPPPPPPPPP/RNBQCKABNR w KQkq - 0 1",  # Gothic
        "rqnbakbncr/pppppppppp/10/10/10/10/PPPPPPPPPP/RQNBAKBNCR w KQkq - 0 1",  # Schoolbook
        "rbncqkanbr/pppppppppp/10/10/10/10/PPPPPPPPPP/RBNCQKANBR w KQkq - 0 1",  # Univers
        "crnbakbnrq/pppppppppp/10/10/10/10/PPPPPPPPPP/CRNBAKBNRQ w KQkq - 0 1",  # Victorian
    ),
    "capahouse": (
        "rnbcqkabnr/pppppppppp/10/10/10/10/PPPPPPPPPP/RNBCQKABNR[] w KQkq - 0 1",  # Bird
        "ranbqkbncr/pppppppppp/10/10/10/10/PPPPPPPPPP/RANBQKBNCR[] w KQkq - 0 1",  # Carrera
        "arnbqkbnrc/pppppppppp/10/10/10/10/PPPPPPPPPP/ARNBQKBNRC[] w KQkq - 0 1",  # Conservative
        "rnbqkcabnr/pppppppppp/10/10/10/10/PPPPPPPPPP/RNBQKCABNR[] w KQkq - 0 1",  # Embassy
        "rnbqckabnr/pppppppppp/10/10/10/10/PPPPPPPPPP/RNBQCKABNR[] w KQkq - 0 1",  # Gothic
        "rqnbakbncr/pppppppppp/10/10/10/10/PPPPPPPPPP/RQNBAKBNCR[] w KQkq - 0 1",  # Schoolbook
        "rbncqkanbr/pppppppppp/10/10/10/10/PPPPPPPPPP/RBNCQKANBR[] w KQkq - 0 1",  # Univers
        "crnbakbnrq/pppppppppp/10/10/10/10/PPPPPPPPPP/CRNBAKBNRQ[] w KQkq - 0 1",  # Victorian
    ),
    "manchu": (
        MANCHU_FEN,
        MANCHU_R_FEN,
    ),
}
