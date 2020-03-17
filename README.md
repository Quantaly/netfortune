# netfortune

A wrapper for Debian's [`fortune`](https://packages.debian.org/stable/games/fortune-mod) program, making it available over the 'Net.

By default it includes fortunes from the [`fortunes-min`](https://packages.debian.org/stable/games/fortunes-min) and [`fortunes`](https://packages.debian.org/stable/games/fortunes) packages; additional packages can be installed by modifying the Dockerfile.

The container requires the `PORT` environment variable to be set.

## Usage example

```
docker build -t netfortune/app .
docker run \
    -e PORT=8080 \
    -p 8080:8080 \
    netfortune/app
```