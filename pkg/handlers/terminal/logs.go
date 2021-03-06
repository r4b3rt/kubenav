package terminal

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"

	log "github.com/sirupsen/logrus"
	"k8s.io/client-go/kubernetes"
)

// LogSession is the structure of a log session, which consists of an unique id and a Kubernetes clientset.
type LogSession struct {
	ClientSet *kubernetes.Clientset
	URL       string
}

// LogSessionMap stores a map of all LogSession objects and a lock to avoid concurrent conflict.
type LogSessionMap struct {
	Sessions map[string]LogSession
	Lock     sync.RWMutex
}

// Get return a given logSession by sessionID.
func (sm *LogSessionMap) Get(sessionID string) (LogSession, bool) {
	sm.Lock.RLock()
	defer sm.Lock.RUnlock()

	session, ok := sm.Sessions[sessionID]
	return session, ok
}

// Set store a LogSession to LogSessionMap.
func (sm *LogSessionMap) Set(sessionID string, session LogSession) {
	sm.Lock.Lock()
	defer sm.Lock.Unlock()
	sm.Sessions[sessionID] = session
}

// Delete removes a session from the active sessions.
func (sm *LogSessionMap) Delete(sessionID string) {
	sm.Lock.Lock()
	defer sm.Lock.Unlock()

	if _, ok := sm.Sessions[sessionID]; ok {
		delete(sm.Sessions, sessionID)
	}
}

// LogSessions holds all active sessions for streamed logs.
var LogSessions = LogSessionMap{Sessions: make(map[string]LogSession)}

// StreamLogsHandler handles the requests to stream the logs of a container.
func StreamLogsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	params := strings.Split(r.URL.Path, "/")
	sessionID := params[len(params)-1]
	logSession, ok := LogSessions.Get(sessionID)
	if !ok {
		log.Error("Log session not found")
		LogSessions.Delete(sessionID)
		return
	}

	readCloser, err := logSession.ClientSet.RESTClient().Get().RequestURI(logSession.URL).Stream(r.Context())
	if err != nil {
		LogSessions.Delete(sessionID)
		return
	}
	defer readCloser.Close()

	for {
		select {
		case <-r.Context().Done():
			LogSessions.Delete(sessionID)
			log.WithError(err).Debugf("Log session was closed")
			return
		default:
			p := make([]byte, 2048)
			n, err := readCloser.Read(p)
			if err != nil {
				LogSessions.Delete(sessionID)

				if err == io.EOF {
					log.WithError(err).Debugf("Log session was closed")
					return
				}

				log.WithError(err).Errorf("Log session was closed")
				return
			}

			if string(p[:n]) != "" {
				w.Write([]byte(fmt.Sprintf("data: %s\n\n", string(p[:n]))))
				w.(http.Flusher).Flush()
			}
		}
	}
}
