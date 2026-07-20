.PHONY: up down build restart logs status artisan npm mysql bash

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

restart: down up

logs:
	docker compose logs -f

status:
	docker compose ps

artisan:
	docker compose exec backend php artisan $(cmd)

npm:
	docker compose exec frontend npm $(cmd)

mysql:
	docker compose exec mysql mysql -u root altokepay

bash-backend:
	docker compose exec backend bash

bash-frontend:
	docker compose exec frontend sh

test-backend:
	docker compose exec backend php artisan test

migrate:
	docker compose exec backend php artisan migrate

seed:
	docker compose exec backend php artisan db:seed

tinker:
	docker compose exec backend php artisan tinker
