# Réviz se trompe ? : monte la boucle de musique du jeu à partir d'une piste Flow Music.
# Usage : python boucle.py <piste.m4a> <début s> <longueur approx. s> <sortie sans extension>
# La longueur exacte (au 1/48000 près) est cherchée autour de la valeur donnée en maximisant la
# ressemblance de l'onde de part et d'autre de la couture ; la fin de la période est fondue (80 ms)
# dans ce qui précède son début, pour que la boucle se referme sans clic. Le fichier final contient
# DEUX périodes : le jeu boucle une fenêtre d'une période au milieu (loopStart 0,5 s), ce qui
# absorbe le décalage que l'encodeur MP3 ajoute au début. Sorties : <sortie>.mp3 (le jeu),
# <sortie>-ecoute.wav (trois tours de boucle, pour écouter la couture) et la longueur exacte.
# Nécessite numpy, soundfile, ffmpeg.
import subprocess, sys, tempfile, numpy as np, soundfile as sf
src, debut, approx, sortie = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
tmp = tempfile.mktemp(suffix='.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-ar', '48000', '-ac', '2', tmp], check=True)
y, sr = sf.read(tmp)
mono = y.mean(1)
a = int(debut * sr)
fen = int(0.6 * sr)
def score(L):
    x, z = mono[a - fen:a + fen], mono[a + L - fen:a + L + fen]
    return float(np.dot(x, z) / (np.linalg.norm(x) * np.linalg.norm(z) + 1e-9))
L0 = int(approx * sr)
L = max(range(L0 - int(0.04 * sr), L0 + int(0.04 * sr)), key=score)
print(f'longueur {L} échantillons = {L / sr:.6f} s, ressemblance de la couture {score(L):.3f}')
n = int(0.08 * sr)
per = y[a:a + L].copy()
f = np.linspace(0, 1, n)[:, None]
per[-n:] = per[-n:] * (1 - f) + y[a - n:a] * f  # la fin glisse vers ce qui précède le début
sf.write(sortie + '-ecoute.wav', np.concatenate([per] * 3), sr)
deux = np.concatenate([per, per])
w = tempfile.mktemp(suffix='.wav'); sf.write(w, deux, sr)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w, '-codec:a', 'libmp3lame', '-b:a', '160k', sortie + '.mp3'], check=True)
print('période', f'{L / sr:.6f}')
