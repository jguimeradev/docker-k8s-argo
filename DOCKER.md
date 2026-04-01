# DOCKER + KUBERNETES

## DOCKER

### Networking

The `docker-compose.yml` file defines a bridge network called `app_net`. Both the `frontend_service` and `backend_service` are attached to this network. This allows them to communicate with each other using their service names as hostnames. For example, the frontend can reach the backend at `http://backend_service:3000`.

The `backend_service` is not exposed to the internet, only the `frontend_service` is. This is a security best practice. The `frontend_service` acts as a proxy to the `backend_service`.

### API Proxy

The `frontend_service` uses Nginx to serve the static content and to act as a reverse proxy to the `backend_service`. The `front/nginx.conf` file is configured to proxy all requests starting with `/api` to the `backend_service`.

This has two main advantages:

1.  **Decoupling:** The frontend code doesn't need to know the address of the backend. It just needs to send requests to `/api`.
2.  **CORS:** It avoids Cross-Origin Resource Sharing (CORS) issues, as the browser will see all requests as coming from the same origin.

### Front

1. Image of a Linux machine with:
    - Nginx
    - Port :80


### Back

1. Image of a Linux machine with:

    - Nginx
    - NodeJS
    - Port 3000
