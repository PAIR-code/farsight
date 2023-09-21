conda activate gam
bump2version patch
python3 -m build
python3 -m twine upload --repository wizmap --skip-existing dist/*
