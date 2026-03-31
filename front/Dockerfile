FROM nginx:alpine

# Copy your static frontend files to Nginx
COPY ./app /usr/share/nginx/html

# Copy a custom Nginx config to proxy API requests
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80