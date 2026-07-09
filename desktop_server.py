import argparse
import functools
import http.server
import os
import socketserver
import subprocess
import sys


class ReusableTcpServer(socketserver.TCPServer):
    allow_reuse_address = True


class NoCacheRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def build_parser():
    parser = argparse.ArgumentParser()
    parser.add_argument("--browser", required=True)
    parser.add_argument("--profile-dir", required=True)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--start-port", type=int, default=4174)
    parser.add_argument("--end-port", type=int, default=4199)
    return parser


def create_server(directory, host, start_port, end_port):
    handler = functools.partial(NoCacheRequestHandler, directory=directory)
    last_error = None

    for port in range(start_port, end_port + 1):
        try:
            return port, ReusableTcpServer((host, port), handler)
        except OSError as error:
            last_error = error

    raise RuntimeError(
        f"Could not start the local server on any port from {start_port} to {end_port}."
    ) from last_error


def main():
    args = build_parser().parse_args()
    app_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(args.profile_dir, exist_ok=True)

    try:
        port, server = create_server(app_dir, args.host, args.start_port, args.end_port)
    except Exception as error:
        print(error)
        return 1

    app_url = f"http://{args.host}:{port}/"
    browser_args = [
        args.browser,
        f"--app={app_url}",
        f"--user-data-dir={args.profile_dir}",
        "--no-first-run",
    ]

    print(flush=True)
    print("CountThatShi desktop server", flush=True)
    print("---------------------------", flush=True)
    print(f"App URL:   {app_url}", flush=True)
    print(f"Save data: {args.profile_dir}", flush=True)
    print(flush=True)
    print("Keep this window open while using the app.", flush=True)
    print("Closing the desktop app window does not stop the server.", flush=True)
    print("Press Ctrl+C in this window to stop the server manually.", flush=True)
    print(flush=True)

    try:
        subprocess.Popen(browser_args)
    except OSError as error:
        server.server_close()
        print(f"Could not launch the browser: {error}")
        return 1

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print()
        print("Stopping CountThatShi server...")
    finally:
        server.server_close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
