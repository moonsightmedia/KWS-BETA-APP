"""Export the approved green Beta icons using Android's original vector.

Requires installed Node dependencies; never restores old Kletterwelt artwork.
"""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]


if __name__ == '__main__':
    subprocess.run(['node', str(ROOT / 'scripts/generate-store-icons.cjs')],
                   cwd=ROOT, check=True)
