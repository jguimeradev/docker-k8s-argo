# Kubernetes Setup — Project Reference

Quick reference for deploying the frontend + backend project on Minikube.

---

## Project Structure

```
project/
├── docker-compose.yml
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── src/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
└── k8s/
    ├── backend-deployment.yaml
    └── frontend-deployment.yaml
```

---

## Files

### `frontend/nginx.conf`

```nginx
server {
    listen 80;

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### `frontend/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

### `backend/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
CMD ["node", "src/index.js"]
```

### `docker-compose.yml`

```yaml
services:
  frontend:
    build:
      context: ./frontend
    image: my-frontend:latest
    container_name: my-frontend
    ports:
      - "80:80"
    networks:
      - app-net

  backend:
    build:
      context: ./backend
    image: my-backend:latest
    container_name: my-backend
    networks:
      - app-net

networks:
  app-net:
    driver: bridge
```

### `k8s/backend-deployment.yaml`

Each manifest file in Kubernetes contains two documents separated by `---`: a **Deployment** and a **Service**. They are always deployed together.

#### Deployment

The Deployment tells Kubernetes *what to run* and *how many copies*.

```yaml
apiVersion: apps/v1       # API version for Deployments
kind: Deployment          # type of Kubernetes object
metadata:
  name: backend           # name of this Deployment
spec:
  replicas: 1             # number of pod instances to keep running
  selector:
    matchLabels:
      app: backend        # the Deployment manages pods with this label
  template:               # blueprint for each pod
    metadata:
      labels:
        app: backend      # label applied to every pod created — must match selector
    spec:
      containers:
        - name: backend           # name of the container inside the pod
          image: my-backend:latest  # image to use (built with docker compose build)
          imagePullPolicy: Never  # never pull from registry — use local image only
          ports:
            - containerPort: 3000 # port the app listens on inside the container
```

Key concepts:

- `replicas` — Kubernetes will always maintain this number of running pods. If one crashes, a new one is created automatically.
- `selector.matchLabels` — how the Deployment knows which pods it owns. Must match `template.metadata.labels`.
- `imagePullPolicy: Never` — specific to Minikube local development. In production this would be `IfNotPresent` or `Always`.

#### Service

The Service tells Kubernetes *how to expose* the pods to the rest of the cluster (or outside).

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend           # THIS name becomes the DNS hostname inside the cluster
spec:
  selector:
    app: backend          # routes traffic to pods with this label
  ports:
    - port: 3000          # port other services use to reach this Service
      targetPort: 3000    # port on the pod to forward traffic to
  # type is omitted → defaults to ClusterIP
  # ClusterIP = only reachable from inside the cluster, never from outside
```

Key concepts:

- `metadata.name` — this is the DNS name other pods use. `http://backend:3000` resolves because this Service is named `backend`.
- `selector` — the Service forwards traffic only to pods matching this label. This is how Service and Deployment are linked.
- `port` vs `targetPort` — `port` is what callers use, `targetPort` is what the container actually listens on. They can differ.
- No `type` → defaults to `ClusterIP` — internal only, invisible from outside the cluster.

---

### `k8s/frontend-deployment.yaml`

Same structure as the backend, but with two important differences: the Service is exposed externally, and NGINX handles the routing.

#### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: my-frontend:latest
          imagePullPolicy: Never
          ports:
            - containerPort: 80   # NGINX listens on port 80 inside the container
```

Identical pattern to the backend — the only differences are the name, image, and port.

#### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend
spec:
  selector:
    app: frontend
  type: NodePort            # exposes this Service on a port on the Minikube node
  ports:
    - port: 80              # internal cluster port
      targetPort: 80        # port NGINX listens on in the container — must match containerPort
      nodePort: 30080       # external port on the node (valid range: 30000–32767)
```

Key concepts:

- `type: NodePort` — unlike ClusterIP, this opens a port on the Minikube node itself, making it reachable from outside the cluster.
- `nodePort: 30080` — the port you'd access via `<node-ip>:30080`. With the Docker driver, use `kubectl port-forward` instead since the node IP isn't directly reachable from the host.
- `targetPort` must match the `containerPort` in the Deployment — if these don't match, connections will be refused (this was the bug we hit during setup).

#### How the two files connect

```
kubectl port-forward :8888
        │
        ▼
Service frontend (NodePort :30080)
        │  selector: app=frontend
        ▼
Pod frontend (NGINX :80)
        │  location /api/ → proxy_pass
        ▼
Service backend (ClusterIP :3000)
        │  selector: app=backend
        ▼
Pod backend (Node.js :3000)
```

The chain works because:
1. The frontend Service finds pods via `selector: app=frontend`
2. NGINX resolves `backend` via Kubernetes DNS — which maps to the backend Service
3. The backend Service finds pods via `selector: app=backend`

---

## Commands

### 1. Start Minikube

```bash
minikube start
```

### 2. Point shell to Minikube's Docker daemon

```bash
eval $(minikube docker-env)
```

> Must be run every new terminal session. Without this, images build on the host and Kubernetes can't find them.

### 3. Build images inside Minikube

```bash
docker compose build
```

Verify images are visible inside Minikube:

```bash
docker images | grep -E "my-frontend|my-backend"
```

### 4. Deploy to Kubernetes

```bash
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
```

### 5. Verify everything is running

```bash
kubectl get pods
kubectl get services
```

Expected output:

```
NAME                       READY   STATUS    RESTARTS   AGE
backend-xxx                1/1     Running   0          1m
frontend-xxx               1/1     Running   0          1m

NAME         TYPE        CLUSTER-IP      PORT(S)        AGE
backend      ClusterIP   10.96.x.x       3000/TCP       1m
frontend     NodePort    10.96.x.x       80:30080/TCP   1m
```

### 6. Access the frontend

```bash
# Minikube tunnel (separate terminal, Docker driver)
minikube tunnel

# Or port-forward (simplest, always works)
kubectl port-forward service/frontend 8888:80
# → open http://localhost:8888
```

---

## Rebuild after code changes

```bash
eval $(minikube docker-env)
docker compose build frontend   # or backend
kubectl rollout restart deployment/frontend   # or backend
kubectl get pods -w   # watch until Running
```

---

## Useful debugging commands

```bash
# Pod logs
kubectl logs -l app=frontend
kubectl logs -l app=backend

# Logs from previous crashed container
kubectl logs <pod-name> --previous

# Pod details and events
kubectl describe pod <pod-name>

# Shell into a running pod
kubectl exec -it <pod-name> -- /bin/sh

# Check service → pod wiring
kubectl get endpoints
```

---

## Teardown

```bash
# Remove deployments and services
kubectl delete -f k8s/frontend-deployment.yaml
kubectl delete -f k8s/backend-deployment.yaml

# Stop Minikube
minikube stop

# Undo Docker daemon redirect
eval $(minikube docker-env --unset)
```
