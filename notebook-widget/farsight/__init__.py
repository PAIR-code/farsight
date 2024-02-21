"""Your sidekick for responsible AI innovation."""

from json import load

# Read the version from package.json
package_json_path = "../package-copy.json"

# Read the package.json file
with open(package_json_path, "r", encoding="utf8") as f:
    package_json = load(f)
    version = package_json["version"]

__author__ = """Jay Wang"""
__email__ = "jayw@zijie.wang"
__version__ = version

from farsight.farsight import *
