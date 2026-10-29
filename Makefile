# FlowSync — atajos de desarrollo.
# Compatible con GNU Make 3.81+ (el que trae macOS) y /bin/sh POSIX, así que
# funciona igual en macOS, Linux y Windows vía WSL.

SHELL := /bin/sh
NPM   ?= npm

.PHONY: help setup start check-node

help:
	@echo "make setup  - instala dependencias, prepara backend/.env, genera APP_KEY y migra la BD"
	@echo "make start  - levanta backend (:3333) y frontend (:5173) a la vez (Ctrl-C para parar)"

check-node:
	@command -v node >/dev/null 2>&1 || { echo "Error: Node.js no está instalado (se requiere 24+)." >&2; exit 1; }
	@case "$$(command -v node)" in /mnt/[a-z]/*) \
		echo "Error: estás usando el Node de Windows ($$(command -v node)). Instala Node 24+ dentro de WSL." >&2; exit 1;; \
	esac
	@node -e 'process.exit(+process.versions.node.split(".")[0] < 24 ? 1 : 0)' || \
		{ echo "Error: se requiere Node.js 24+ (tienes $$(node -v))." >&2; exit 1; }

setup: check-node
	cd backend && $(NPM) install
	cd frontend && $(NPM) install
	@if [ ! -f backend/.env ]; then \
		cp backend/.env.example backend/.env && echo "Creado backend/.env"; \
	else \
		echo "backend/.env ya existe, no se toca"; \
	fi
	@key=$$(sed -n 's/^APP_KEY=//p' backend/.env | tr -d " \t\r\"'"); \
	if [ -n "$$key" ]; then \
		echo "APP_KEY ya definida, no se regenera"; \
	else \
		cd backend && node ace generate:key; \
	fi
	cd backend && node ace migration:run

start: check-node
	@for d in backend frontend; do \
		[ -d $$d/node_modules ] || { echo "Error: faltan dependencias en $$d/. Ejecuta 'make setup'." >&2; exit 1; }; \
	done
	@[ -f backend/.env ] || { echo "Error: falta backend/.env. Ejecuta 'make setup'." >&2; exit 1; }
	@trap 'trap - INT TERM; kill -INT 0' INT TERM; \
	(cd backend && $(NPM) run dev) & be=$$!; \
	(cd frontend && $(NPM) run dev) & fe=$$!; \
	while kill -0 $$be 2>/dev/null && kill -0 $$fe 2>/dev/null; do sleep 1; done; \
	echo "Uno de los servidores se ha detenido; parando el otro." >&2; \
	trap - INT TERM; kill -INT 0
