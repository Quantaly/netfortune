FROM golang:1.14-buster

RUN apt update && \
    apt -y install fortune-mod fortunes && \
    rm -rf /var/lib/apt/lists/*