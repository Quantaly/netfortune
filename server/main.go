package main

import (
	"html/template"
	"log"
)

var templates = template.Must(template.ParseFiles("web/templates/index.html"))

func main() {
	log.Println("template successfully parsed")
}
