FROM golang:1.14-buster AS build

WORKDIR /app

RUN apt update && \
    apt -y install fortune-mod fortunes && \
    rm -rf /var/lib/apt/lists/*

COPY setup setup

RUN cd setup && \
    go run main.go && \
    gzip < fortunes.json > fortunes.json.gz

COPY server server

RUN cd server && \
    go build

FROM debian:latest

WORKDIR /app

COPY --from=build /app/server/server server
COPY --from=build /app/setup/fortunes.json fortunes.json
COPY --from=build /app/setup/fortunes.json.gz fortunes.json.gz

COPY web web

CMD [ "./server" ]