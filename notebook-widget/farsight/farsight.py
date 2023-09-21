import random
import html
import base64
import pkgutil

from IPython.display import display_html


def _make_html(prompt, component):
    """
    Function to create an HTML string to bundle Farsight's html, css, and js.
    We use base64 to encode the js so that we can use inline defer for <script>

    We add another script to pass Python data as inline json, and dispatch an
    event to transfer the data

    Args:
        prompt(str): Current prompt for an AI feature
        component(str): Value of "farsight" | "lite" | "signal"

    Return:
        HTML code with deferred JS code in base64 format
    """
    # HTML template for Farsight widget
    html_top = """<!DOCTYPE html><html lang="en"> <head> <meta charset="UTF-8"/> <link rel="icon" href="/favicon.ico"/> <meta name="viewport" content="width=device-width, initial-scale=1.0"/> <title>Farsight</title> <link rel="preconnect" href="https://fonts.googleapis.com"/> <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/> <link href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap" rel="stylesheet"/> <style>*, ::after, ::before, body{box-sizing: border-box;}html{font-size: 16px; -moz-osx-font-smoothing: grayscale; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; -webkit-text-size-adjust: 100%; -moz-text-size-adjust: 100%; scroll-behavior: smooth; overflow-x: hidden;}body, html{position: relative; width: 100%; height: 100%;}body{margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif; color: #494949; font-size: 1em; font-weight: 400; line-height: 1.5;}a{color: #0064c8; text-decoration: none;}a:hover{text-decoration: underline;}a:visited{color: #0050a0;}label{display: block;}button, input, select, textarea{font-family: inherit; font-size: inherit; border: 1px solid #ccc; border-radius: 2px;}input:disabled{color: #ccc;}button{color: #333; background-color: #f4f4f4; outline: 0;}button:disabled{color: #999;}button:not(:disabled):active{background-color: #ddd;}button:focus{border-color: #666;}:root{--ease-cubic-in-out: cubic-bezier(0.645, 0.045, 0.355, 1); --md-red-50: hsl(350, 100%, 96.08%); --md-red-100: hsl(354, 100%, 90.2%); --md-red-200: hsl(0, 72.65%, 77.06%); --md-red-300: hsl(0, 68.67%, 67.45%); --md-red-400: hsl(1, 83.25%, 62.55%); --md-red-500: hsl(4, 89.62%, 58.43%); --md-red-600: hsl(1, 77.19%, 55.29%); --md-red-700: hsl(0, 65.08%, 50.59%); --md-red-800: hsl(0, 66.39%, 46.67%); --md-red-900: hsl(0, 73.46%, 41.37%); --md-red-a100: hsl(4, 100%, 75.1%); --md-red-a200: hsl(0, 100%, 66.08%); --md-red-a400: hsl(348, 100%, 54.51%); --md-red-a700: hsl(0, 100%, 41.76%); --md-pink-50: hsl(340, 80%, 94.12%); --md-pink-100: hsl(339, 81.33%, 85.29%); --md-pink-200: hsl(339, 82.11%, 75.88%); --md-pink-300: hsl(339, 82.56%, 66.27%); --md-pink-400: hsl(339, 81.9%, 58.82%); --md-pink-500: hsl(339, 82.19%, 51.57%); --md-pink-600: hsl(338, 77.78%, 47.65%); --md-pink-700: hsl(336, 77.98%, 42.75%); --md-pink-800: hsl(333, 79.27%, 37.84%); --md-pink-900: hsl(328, 81.33%, 29.41%); --md-pink-a100: hsl(339, 100%, 75.1%); --md-pink-a200: hsl(339, 100%, 62.55%); --md-pink-a400: hsl(338, 100%, 48.04%); --md-pink-a700: hsl(333, 84.11%, 41.96%); --md-purple-50: hsl(292, 44.44%, 92.94%); --md-purple-100: hsl(291, 46.07%, 82.55%); --md-purple-200: hsl(291, 46.94%, 71.18%); --md-purple-300: hsl(291, 46.6%, 59.61%); --md-purple-400: hsl(291, 46.61%, 50.78%); --md-purple-500: hsl(291, 63.72%, 42.16%); --md-purple-600: hsl(287, 65.05%, 40.39%); --md-purple-700: hsl(282, 67.88%, 37.84%); --md-purple-800: hsl(277, 70.17%, 35.49%); --md-purple-900: hsl(267, 75%, 31.37%); --md-purple-a100: hsl(291, 95.38%, 74.51%); --md-purple-a200: hsl(291, 95.9%, 61.76%); --md-purple-a400: hsl(291, 100%, 48.82%); --md-purple-a700: hsl(280, 100%, 50%); --md-deep-purple-50: hsl(264, 45.45%, 93.53%); --md-deep-purple-100: hsl(261, 45.68%, 84.12%); --md-deep-purple-200: hsl(261, 46.27%, 73.73%); --md-deep-purple-300: hsl(261, 46.81%, 63.14%); --md-deep-purple-400: hsl(261, 46.72%, 55.1%); --md-deep-purple-500: hsl(261, 51.87%, 47.25%); --md-deep-purple-600: hsl(259, 53.91%, 45.1%); --md-deep-purple-700: hsl(257, 57.75%, 41.76%); --md-deep-purple-800: hsl(254, 60.8%, 39.02%); --md-deep-purple-900: hsl(251, 68.79%, 33.92%); --md-deep-purple-a100: hsl(261, 100%, 76.67%); --md-deep-purple-a200: hsl(255, 100%, 65.1%); --md-deep-purple-a400: hsl(258, 100%, 56.08%); --md-deep-purple-a700: hsl(265, 100%, 45.88%); --md-indigo-50: hsl(231, 43.75%, 93.73%); --md-indigo-100: hsl(231, 45%, 84.31%); --md-indigo-200: hsl(230, 44.36%, 73.92%); --md-indigo-300: hsl(230, 44.09%, 63.53%); --md-indigo-400: hsl(230, 44.25%, 55.69%); --md-indigo-500: hsl(230, 48.36%, 47.84%); --md-indigo-600: hsl(231, 50%, 44.71%); --md-indigo-700: hsl(231, 53.62%, 40.59%); --md-indigo-800: hsl(232, 57.22%, 36.67%); --md-indigo-900: hsl(234, 65.79%, 29.8%); --md-indigo-a100: hsl(230, 100%, 77.45%); --md-indigo-a200: hsl(230, 98.84%, 66.08%); --md-indigo-a400: hsl(230, 98.97%, 61.76%); --md-indigo-a700: hsl(230, 99.04%, 59.22%); --md-blue-50: hsl(205, 86.67%, 94.12%); --md-blue-100: hsl(207, 88.89%, 85.88%); --md-blue-200: hsl(206, 89.74%, 77.06%); --md-blue-300: hsl(206, 89.02%, 67.84%); --md-blue-400: hsl(206, 89.95%, 60.98%); --md-blue-500: hsl(206, 89.74%, 54.12%); --md-blue-600: hsl(208, 79.28%, 50.78%); --md-blue-700: hsl(209, 78.72%, 46.08%); --md-blue-800: hsl(211, 80.28%, 41.76%); --md-blue-900: hsl(216, 85.06%, 34.12%); --md-blue-a100: hsl(217, 100%, 75.49%); --md-blue-a200: hsl(217, 100%, 63.33%); --md-blue-a400: hsl(217, 100%, 58.04%); --md-blue-a700: hsl(224, 100%, 58.04%); --md-light-blue-50: hsl(198, 93.55%, 93.92%); --md-light-blue-100: hsl(198, 92.41%, 84.51%); --md-light-blue-200: hsl(198, 92.37%, 74.31%); --md-light-blue-300: hsl(198, 91.3%, 63.92%); --md-light-blue-400: hsl(198, 91.93%, 56.27%); --md-light-blue-500: hsl(198, 97.57%, 48.43%); --md-light-blue-600: hsl(199, 97.41%, 45.49%); --md-light-blue-700: hsl(201, 98.1%, 41.37%); --md-light-blue-800: hsl(202, 97.91%, 37.45%); --md-light-blue-900: hsl(206, 98.72%, 30.59%); --md-light-blue-a100: hsl(198, 100%, 75.1%); --md-light-blue-a200: hsl(198, 100%, 62.55%); --md-light-blue-a400: hsl(198, 100%, 50%); --md-light-blue-a700: hsl(202, 100%, 45.88%); --md-cyan-50: hsl(186, 72.22%, 92.94%); --md-cyan-100: hsl(186, 71.11%, 82.35%); --md-cyan-200: hsl(186, 71.62%, 70.98%); --md-cyan-300: hsl(186, 71.15%, 59.22%); --md-cyan-400: hsl(186, 70.87%, 50.2%); --md-cyan-500: hsl(186, 100%, 41.57%); --md-cyan-600: hsl(186, 100%, 37.84%); --md-cyan-700: hsl(185, 100%, 32.75%); --md-cyan-800: hsl(185, 100%, 28.04%); --md-cyan-900: hsl(182, 100%, 19.61%); --md-cyan-a100: hsl(180, 100%, 75.88%); --md-cyan-a200: hsl(180, 100%, 54.71%); --md-cyan-a400: hsl(186, 100%, 50%); --md-cyan-a700: hsl(187, 100%, 41.57%); --md-teal-50: hsl(176, 40.91%, 91.37%); --md-teal-100: hsl(174, 41.28%, 78.63%); --md-teal-200: hsl(174, 41.9%, 64.9%); --md-teal-300: hsl(174, 41.83%, 50.78%); --md-teal-400: hsl(174, 62.75%, 40%); --md-teal-500: hsl(174, 100%, 29.41%); --md-teal-600: hsl(173, 100%, 26.86%); --md-teal-700: hsl(173, 100%, 23.73%); --md-teal-800: hsl(172, 100%, 20.59%); --md-teal-900: hsl(169, 100%, 15.1%); --md-teal-a100: hsl(166, 100%, 82.75%); --md-teal-a200: hsl(165, 100%, 69.61%); --md-teal-a400: hsl(165, 82.26%, 51.37%); --md-teal-a700: hsl(171, 100%, 37.45%); --md-green-50: hsl(124, 39.39%, 93.53%); --md-green-100: hsl(121, 37.5%, 84.31%); --md-green-200: hsl(122, 37.4%, 74.31%); --md-green-300: hsl(122, 38.46%, 64.31%); --md-green-400: hsl(122, 38.46%, 56.67%); --md-green-500: hsl(122, 39.44%, 49.22%); --md-green-600: hsl(122, 40.97%, 44.51%); --md-green-700: hsl(122, 43.43%, 38.82%); --md-green-800: hsl(123, 46.2%, 33.53%); --md-green-900: hsl(124, 55.37%, 23.73%); --md-green-a100: hsl(136, 77.22%, 84.51%); --md-green-a200: hsl(150, 81.82%, 67.65%); --md-green-a400: hsl(150, 100%, 45.1%); --md-green-a700: hsl(144, 100%, 39.22%); --md-light-green-50: hsl(88, 51.72%, 94.31%); --md-light-green-100: hsl(87, 50.68%, 85.69%); --md-light-green-200: hsl(88, 50%, 76.47%); --md-light-green-300: hsl(87, 50%, 67.06%); --md-light-green-400: hsl(87, 50.24%, 59.8%); --md-light-green-500: hsl(87, 50.21%, 52.75%); --md-light-green-600: hsl(89, 46.12%, 48.04%); --md-light-green-700: hsl(92, 47.91%, 42.16%); --md-light-green-800: hsl(95, 49.46%, 36.47%); --md-light-green-900: hsl(103, 55.56%, 26.47%); --md-light-green-a100: hsl(87, 100%, 78.24%); --md-light-green-a200: hsl(87, 100%, 67.45%); --md-light-green-a400: hsl(92, 100%, 50.59%); --md-light-green-a700: hsl(96, 81.15%, 47.84%); --md-lime-50: hsl(65, 71.43%, 94.51%); --md-lime-100: hsl(64, 69.01%, 86.08%); --md-lime-200: hsl(65, 70.69%, 77.25%); --md-lime-300: hsl(65, 70.37%, 68.24%); --md-lime-400: hsl(65, 69.7%, 61.18%); --md-lime-500: hsl(65, 69.96%, 54.31%); --md-lime-600: hsl(63, 59.68%, 49.61%); --md-lime-700: hsl(62, 61.43%, 43.73%); --md-lime-800: hsl(59, 62.89%, 38.04%); --md-lime-900: hsl(53, 69.93%, 30%); --md-lime-a100: hsl(65, 100%, 75.29%); --md-lime-a200: hsl(65, 100%, 62.75%); --md-lime-a400: hsl(73, 100%, 50%); --md-lime-a700: hsl(75, 100%, 45.88%); --md-yellow-50: hsl(55, 100%, 95.29%); --md-yellow-100: hsl(53, 100%, 88.43%); --md-yellow-200: hsl(53, 100%, 80.78%); --md-yellow-300: hsl(53, 100%, 73.14%); --md-yellow-400: hsl(53, 100%, 67.25%); --md-yellow-500: hsl(53, 100%, 61.57%); --md-yellow-600: hsl(48, 98.04%, 60%); --md-yellow-700: hsl(42, 96.26%, 58.04%); --md-yellow-800: hsl(37, 94.64%, 56.08%); --md-yellow-900: hsl(28, 91.74%, 52.55%); --md-yellow-a100: hsl(60, 100%, 77.65%); --md-yellow-a200: hsl(60, 100%, 50%); --md-yellow-a400: hsl(55, 100%, 50%); --md-yellow-a700: hsl(50, 100%, 50%); --md-amber-50: hsl(46, 100%, 94.12%); --md-amber-100: hsl(45, 100%, 85.1%); --md-amber-200: hsl(45, 100%, 75.49%); --md-amber-300: hsl(45, 100%, 65.49%); --md-amber-400: hsl(45, 100%, 57.84%); --md-amber-500: hsl(45, 100%, 51.37%); --md-amber-600: hsl(42, 100%, 50%); --md-amber-700: hsl(37, 100%, 50%); --md-amber-800: hsl(33, 100%, 50%); --md-amber-900: hsl(26, 100%, 50%); --md-amber-a100: hsl(47, 100%, 74.9%); --md-amber-a200: hsl(47, 100%, 62.55%); --md-amber-a400: hsl(46, 100%, 50%); --md-amber-a700: hsl(40, 100%, 50%); --md-orange-50: hsl(36, 100%, 93.92%); --md-orange-100: hsl(35, 100%, 84.9%); --md-orange-200: hsl(35, 100%, 75.1%); --md-orange-300: hsl(35, 100%, 65.1%); --md-orange-400: hsl(35, 100%, 57.45%); --md-orange-500: hsl(35, 100%, 50%); --md-orange-600: hsl(33, 100%, 49.22%); --md-orange-700: hsl(30, 100%, 48.04%); --md-orange-800: hsl(27, 100%, 46.86%); --md-orange-900: hsl(21, 100%, 45.1%); --md-orange-a100: hsl(38, 100%, 75.1%); --md-orange-a200: hsl(33, 100%, 62.55%); --md-orange-a400: hsl(34, 100%, 50%); --md-orange-a700: hsl(25, 100%, 50%); --md-deep-orange-50: hsl(5, 71.43%, 94.51%); --md-deep-orange-100: hsl(14, 100%, 86.86%); --md-deep-orange-200: hsl(14, 100%, 78.43%); --md-deep-orange-300: hsl(14, 100%, 69.8%); --md-deep-orange-400: hsl(14, 100%, 63.14%); --md-deep-orange-500: hsl(14, 100%, 56.67%); --md-deep-orange-600: hsl(14, 90.68%, 53.73%); --md-deep-orange-700: hsl(14, 80.39%, 50%); --md-deep-orange-800: hsl(14, 82.28%, 46.47%); --md-deep-orange-900: hsl(14, 88.18%, 39.8%); --md-deep-orange-a100: hsl(14, 100%, 75.1%); --md-deep-orange-a200: hsl(14, 100%, 62.55%); --md-deep-orange-a400: hsl(14, 100%, 50%); --md-deep-orange-a700: hsl(11, 100%, 43.33%); --md-brown-50: hsl(19, 15.79%, 92.55%); --md-brown-100: hsl(16, 15.79%, 81.37%); --md-brown-200: hsl(14, 15.19%, 69.02%); --md-brown-300: hsl(15, 15.32%, 56.47%); --md-brown-400: hsl(15, 17.5%, 47.06%); --md-brown-500: hsl(15, 25.39%, 37.84%); --md-brown-600: hsl(15, 25.29%, 34.12%); --md-brown-700: hsl(14, 25.68%, 29.02%); --md-brown-800: hsl(11, 25.81%, 24.31%); --md-brown-900: hsl(8, 27.84%, 19.02%); --md-gray-50: hsl(0, 0%, 98.04%); --md-gray-100: hsl(0, 0%, 96.08%); --md-gray-200: hsl(0, 0%, 93.33%); --md-gray-300: hsl(0, 0%, 87.84%); --md-gray-400: hsl(0, 0%, 74.12%); --md-gray-500: hsl(0, 0%, 61.96%); --md-gray-600: hsl(0, 0%, 45.88%); --md-gray-700: hsl(0, 0%, 38.04%); --md-gray-800: hsl(0, 0%, 25.88%); --md-gray-900: hsl(0, 0%, 12.94%); --md-blue-gray-50: hsl(204, 15.15%, 93.53%); --md-blue-gray-100: hsl(198, 15.66%, 83.73%); --md-blue-gray-200: hsl(199, 15.33%, 73.14%); --md-blue-gray-300: hsl(199, 15.63%, 62.35%); --md-blue-gray-400: hsl(200, 15.38%, 54.12%); --md-blue-gray-500: hsl(199, 18.3%, 46.08%); --md-blue-gray-600: hsl(198, 18.45%, 40.39%); --md-blue-gray-700: hsl(199, 18.34%, 33.14%); --md-blue-gray-800: hsl(199, 17.91%, 26.27%); --md-blue-gray-900: hsl(199, 19.15%, 18.43%); --md-blue-gray-1000: hsl(199, 20.93%, 8.43%);}</style>"""
    html_bottom = (
        """</head><body><farsight-demo-page></farsight-demo-page></body></html>"""
    )

    if component == "lite":
        html_bottom = """</head><body><farsight-demo-page-lite></farsight-demo-page-lite></body></html>"""

    if component == "signal":
        html_bottom = """</head><body><farsight-demo-page-signal></farsight-demo-page-signal></body></html>"""

    # Read the bundled JS file
    js_b = pkgutil.get_data(__name__, "farsight.js")

    # Read local JS file (for development only)
    # with open("./Farsight.js", "r") as fp:
    #     js_string = fp.read()
    # js_b = bytes(js_string, encoding="utf-8")

    # Encode the JS & CSS with base 64
    js_base64 = base64.b64encode(js_b).decode("utf-8")

    # Pass data into JS by using another script to dispatch an event
    messenger_js = f"""
        (function() {{
            const event = new Event('farsightData');
            event.prompt = `{prompt}`;
            document.dispatchEvent(event);
        }}())
    """
    messenger_js = messenger_js.encode()
    messenger_js_base64 = base64.b64encode(messenger_js).decode("utf-8")

    # Inject the JS to the html template
    html_str = (
        html_top
        + """<script type="module" crossorigin defer src='data:text/javascript;base64,{}'></script>""".format(
            js_base64
        )
        + """<script defer src='data:text/javascript;base64,{}'></script>""".format(
            messenger_js_base64
        )
        + html_bottom
    )

    return html.escape(html_str)


def envision(prompt, height=700):
    """
    Render Farsight in the output cell.

    Args:
        prompt(str): Current prompt for an AI feature
        height(int): Height of the whole window

    Return:
        HTML code with deferred JS code in base64 format
    """
    html_str = _make_html(prompt, "farsight")

    # Randomly generate an ID for the iframe to avoid collision
    iframe_id = "Farsight-iframe-" + str(int(random.random() * 1e8))

    iframe = f"""
        <iframe
            srcdoc="{html_str}"
            frameBorder="0"
            width="100%"
            height="{height}px"
            id="{iframe_id}"
            style="border: 1px solid hsl(0, 0%, 90%); border-radius: 5px;">
        </iframe>
    """

    # Display the iframe
    display_html(iframe, raw=True)


def sidebar(prompt, height=700):
    """
    Render Farsight Awareness Sidebar in the output cell.

    Args:
        prompt(str): Current prompt for an AI feature
        height(int): Height of the whole window

    Return:
        HTML code with deferred JS code in base64 format
    """
    html_str = _make_html(prompt, "lite")

    # Randomly generate an ID for the iframe to avoid collision
    iframe_id = "Farsight-iframe-" + str(int(random.random() * 1e8))

    iframe = f"""
        <iframe
            srcdoc="{html_str}"
            frameBorder="0"
            width="100%"
            height="{height}px"
            id="{iframe_id}"
            style="border: 1px solid hsl(0, 0%, 90%); border-radius: 5px;">
        </iframe>
    """

    # Display the iframe
    display_html(iframe, raw=True)


def symbol(prompt, height=65):
    """
    Render Farsight Symbol in the output cell.

    Args:
        prompt(str): Current prompt for an AI feature
        height(int): Height of the whole window

    Return:
        HTML code with deferred JS code in base64 format
    """
    html_str = _make_html(prompt, "signal")

    # Randomly generate an ID for the iframe to avoid collision
    iframe_id = "Farsight-iframe-" + str(int(random.random() * 1e8))

    iframe = f"""
        <iframe
            srcdoc="{html_str}"
            frameBorder="0"
            width="100%"
            height="{height}px"
            id="{iframe_id}"
            style="border: 1px solid hsl(0, 0%, 90%); border-radius: 5px;">
        </iframe>
    """

    # Display the iframe
    display_html(iframe, raw=True)