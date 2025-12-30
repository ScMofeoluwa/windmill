package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/scmofeoluwa/windmill/internal/monitor"
	"github.com/scmofeoluwa/windmill/ui"
)

type API struct {
	monitor *monitor.Monitor
	router  chi.Router
}

func New(monitor *monitor.Monitor) *API {
	api := &API{
		monitor: monitor,
		router:  chi.NewRouter(),
	}

	api.setupRoutes()
	return api
}

func (a *API) Handler() http.Handler {
	return a.router
}

func (a *API) setupRoutes() {
	a.router.Use(BasicAuth())
	a.router.Use(middleware.Recoverer)
	a.router.Route("/api", func(r chi.Router) {
		r.Get("/overview", a.handleGetOverview)
		r.Get("/streams", a.handleGetStreams)
		r.Get("/streams/{name}", a.handleGetStream)
		r.Get("/streams/{name}/messages", a.handleGetStreamMessages)
		r.Get("/streams/{name}/messages/{id}", a.handleGetStreamMessage)
		r.Delete("/streams/{name}/messages/{id}", a.handleDeleteMessage)

		r.Get("/dlq", a.handleGetDLQStats)
		r.Get("/dlq/messages", a.handleGetDLQMessages)
		r.Get("/dlq/messages/{id}", a.handleGetDLQMessage)
		r.Post("/dlq/messages/{id}/requeue", a.handleRequeueMessage)
		r.Post("/dlq/requeue-all", a.handleRequeueAll)
		r.Delete("/dlq/messages/{id}", a.handleDeleteDLQMessage)
	})

	a.router.Mount("/", ui.Handler())
}
