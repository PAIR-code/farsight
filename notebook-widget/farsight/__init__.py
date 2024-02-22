"""Your sidekick for responsible AI innovation."""

import pkgutil

# Read the version from a generated version.txt file
version = pkgutil.get_data(__name__, "version.txt").decode()

__author__ = """Jay Wang"""
__email__ = "jayw@zijie.wang"
__version__ = version

from farsight.farsight import *
