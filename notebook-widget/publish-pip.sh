conda activate gam
python3 -m build
python3 -m twine upload --repository farsight --skip-existing dist/*
