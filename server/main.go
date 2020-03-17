package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"time"
)

// FortunesFile is the format of the fortunes.json file
type FortunesFile struct {
	Fortunes []string
}

// FortuneHolder holds a fortune for template rendering
type FortuneHolder struct {
	Fortune string
}

var templates = template.Must(template.ParseFiles("web/templates/index.html"))
var fortunes []string
var fortuneFileLength int
var rng = rand.New(rand.NewSource(time.Now().UnixNano()))
var gzipRegex = regexp.MustCompile("(?:^|, )gzip(?:, |$)")

func randomFortune() string {
	i := rng.Int() % len(fortunes)
	return fortunes[i]
}

func renderTemplate(w io.Writer, fortune string) (int, error) {
	err := templates.ExecuteTemplate(w, "index.html", FortuneHolder{fortune})
	if err != nil {
		return http.StatusInternalServerError, err
	}
	return http.StatusOK, nil
}

func writeFile(w io.Writer, filename string) (int, error) {
	buf := make([]byte, 65536)
	file, err := os.Open(filename)
	if err != nil {
		return http.StatusNotFound, err
	}
	for {
		readLen, err := file.Read(buf)
		if err != nil {
			if err == io.EOF {
				_, err = w.Write(buf[:readLen])
				if err != nil {
					return http.StatusInternalServerError, err
				}
				return http.StatusOK, nil
			}
			return http.StatusInternalServerError, err
		}
		_, err = w.Write(buf[:readLen])
		if err != nil {
			return http.StatusInternalServerError, err
		}
	}
}

func main() {
	log.Println("Reading fortunes.json")
	file, err := ioutil.ReadFile("fortunes.json")
	if err != nil {
		log.Fatalln(err)
	}
	fortuneFileLength = len(file)
	parsed := &FortunesFile{}
	err = json.Unmarshal(file, parsed)
	if err != nil {
		log.Fatalln(err)
	}
	fortunes = parsed.Fortunes

	log.Println("Preparing to serve")
	http.HandleFunc("/fortunes/random", func(w http.ResponseWriter, r *http.Request) {
		toSend := []byte(randomFortune())
		w.Header().Add("Content-Length", strconv.Itoa(len(toSend)))
		w.Write(toSend)
	})
	http.HandleFunc("/fortunes/all", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Add("Content-Type", "application/json")
		w.Header().Add("Content-Length", strconv.Itoa(fortuneFileLength))
		for _, accept := range r.Header["Accept-Encoding"] {
			if gzipRegex.MatchString(accept) {
				w.Header().Add("Content-Encoding", "gzip")
				code, err := writeFile(w, "fortunes.json.gz")
				if err != nil {
					http.Error(w, err.Error(), code)
				}
				return
			}
		}
		code, err := writeFile(w, "fortunes.json")
		if err != nil {
			http.Error(w, err.Error(), code)
		}
	})
	http.Handle("/static/", http.FileServer(http.Dir("web")))
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.Redirect(w, r, "/", http.StatusPermanentRedirect)
		} else {
			code, err := renderTemplate(w, randomFortune())
			if err != nil {
				http.Error(w, err.Error(), code)
			}
		}
	})
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%s", os.Getenv("PORT")), nil))
}
