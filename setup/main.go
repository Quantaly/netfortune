package main

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"regexp"
)

var (
	separatorRegex = regexp.MustCompile("\n%\n")
	periodRegex    = regexp.MustCompile("\\.")
)

func main() {
	fileInfos, err := ioutil.ReadDir("/usr/share/games/fortunes")
	if err != nil {
		log.Fatalln(err)
	}
	allFortunes := make([]string, 0, 1000)
	for _, info := range fileInfos {
		if !info.IsDir() && !periodRegex.MatchString(info.Name()) {
			allFortunes, err = parseFortuneFile("/usr/share/games/fortunes/"+info.Name(), allFortunes)
			if err != nil {
				log.Fatalln(err)
			}
		}
	}
	json, err := json.Marshal(map[string][]string{"fortunes": allFortunes})
	if err != nil {
		log.Fatalln(err)
	}
	err = ioutil.WriteFile("fortunes.json", json, 0664)
	if err != nil {
		log.Fatalln(err)
	}
}

func parseFortuneFile(filename string, allFortunes []string) ([]string, error) {
	contents, err := ioutil.ReadFile(filename)
	if err != nil {
		return allFortunes, err
	}
	fortunes := separatorRegex.Split(string(contents), -1)
	return append(allFortunes, fortunes...), nil
}
