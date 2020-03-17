FROM netfortune/base AS build

WORKDIR /app

COPY setup setup

RUN cd setup && \
    go run main.go && \
    mv fortunes.json .. && \
    cd .. && \
    gzip < fortunes.json > fortunes.json.gz

COPY server server

RUN cd server && \
    go build && \
    mv server ../app

FROM debian:latest

WORKDIR /app

COPY --from=build /app/app server
COPY --from=build /app/fortunes.json fortunes.json
COPY --from=build /app/fortunes.json.gz fortunes.json.gz

COPY web web

CMD [ "./server" ]