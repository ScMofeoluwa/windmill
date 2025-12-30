package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/scmofeoluwa/windmill/internal/monitor"
)

func (a *API) handleGetOverview(w http.ResponseWriter, r *http.Request) {
	overview, err := a.monitor.GetOverview(r.Context())
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSON(w, http.StatusOK, overview)
}

func (a *API) handleGetStreams(w http.ResponseWriter, r *http.Request) {
	streams, err := a.monitor.Streams().GetStreams(r.Context())
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSON(w, http.StatusOK, streams)
}

func (a *API) handleGetStream(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	stream, err := a.monitor.Streams().GetStreamDetail(r.Context(), name)
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	if stream == nil {
		Error(w, http.StatusNotFound, "stream not found")
		return
	}

	JSON(w, http.StatusOK, stream)
}

func (a *API) handleGetStreamMessages(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	opts, err := parsePaginationOpts(r)
	if err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	messages, err := a.monitor.Streams().GetStreamMessages(r.Context(), name, opts)
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSON(w, http.StatusOK, messages)
}

func (a *API) handleGetStreamMessage(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	id := chi.URLParam(r, "id")

	message, err := a.monitor.Streams().GetMessage(r.Context(), name, id)
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	if message == nil {
		Error(w, http.StatusNotFound, "message not found")
		return
	}

	JSON(w, http.StatusOK, message)
}

func (a *API) handleDeleteMessage(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	id := chi.URLParam(r, "id")

	if err := a.monitor.Streams().DeleteMessage(r.Context(), name, id); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	NoContent(w)
}

func (a *API) handleGetDLQStats(w http.ResponseWriter, r *http.Request) {
	stats, err := a.monitor.DLQ().GetStats(r.Context())
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSON(w, http.StatusOK, stats)
}

func (a *API) handleGetDLQMessages(w http.ResponseWriter, r *http.Request) {
	opts, err := parsePaginationOpts(r)
	if err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	messages, err := a.monitor.DLQ().GetMessages(r.Context(), opts)
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSON(w, http.StatusOK, messages)
}

func (a *API) handleGetDLQMessage(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	message, err := a.monitor.DLQ().GetMessage(r.Context(), id)
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	if message == nil {
		Error(w, http.StatusNotFound, "message not found")
		return
	}

	JSON(w, http.StatusOK, message)
}

func (a *API) handleRequeueMessage(w http.ResponseWriter, r *http.Request) {
	var payload map[string]any
	id := chi.URLParam(r, "id")

	if r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			Error(w, http.StatusBadRequest, err.Error())
			return
		}
	}

	if err := a.monitor.DLQ().RequeueMessage(r.Context(), id, payload); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSON(w, http.StatusOK, nil)
}

func (a *API) handleRequeueAll(w http.ResponseWriter, r *http.Request) {
	count, err := a.monitor.DLQ().RequeueAll(r.Context())
	if err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSON(w, http.StatusOK, map[string]int64{"requeued": count})
}

func (a *API) handleDeleteDLQMessage(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	if err := a.monitor.DLQ().DeleteMessage(r.Context(), id); err != nil {
		Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	NoContent(w)
}

func parsePaginationOpts(r *http.Request) (monitor.PaginationOpts, error) {
	const MaxLimit = 100
	var opts monitor.PaginationOpts

	opts.Cursor = r.URL.Query().Get("cursor")

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		limit, err := strconv.ParseInt(limitStr, 10, 64)
		if err != nil {
			return opts, fmt.Errorf("invalid limit")
		}

		if limit > MaxLimit {
			limit = MaxLimit
		}

		opts.Limit = limit
	}

	if orderStr := r.URL.Query().Get("order"); orderStr != "" {
		order, err := monitor.ParseSortOrder(orderStr)
		if err != nil {
			return opts, fmt.Errorf("invalid order")
		}
		opts.Order = order
	}

	return opts.WithDefaults(), nil
}
