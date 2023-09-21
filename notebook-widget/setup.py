#!/usr/bin/env python

"""The setup script."""

from json import loads
from setuptools import setup, find_packages
from pathlib import Path

with open("README.md", "r") as readme_file:
    readme = readme_file.read()

requirements = ["ipython"]

test_requirements = []

setup(
    author="Jay Wang",
    author_email="jayw@zijie.wang",
    python_requires=">=3.6",
    platforms="Linux, Mac OS X, Windows",
    keywords=[
        "Jupyter",
        "JupyterLab",
        "JupyterLab3",
        "Machine Learning",
        "Visualization",
        "Interactive Visualization",
        "Embeddings",
    ],
    classifiers=[
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Framework :: Jupyter",
        "Framework :: Jupyter :: JupyterLab",
        "Framework :: Jupyter :: JupyterLab :: 3",
    ],
    description="A Python package to run Farsight in your computational notebooks.",
    install_requires=requirements,
    license="MIT license",
    long_description=readme,
    long_description_content_type="text/markdown",
    include_package_data=True,
    name="farsight",
    packages=find_packages(include=["farsight", "farsight.*"]),
    test_suite="tests",
    tests_require=test_requirements,
    url="https://github.com/PAIR-code/farsight",
    version="0.1.2",
    zip_safe=False,
)
