.DEFAULT_GOAL := help

POWERSHELL := powershell.exe
PROJECT_SCRIPT := .\scripts\project.ps1
DRY_RUN_FLAG := $(if $(DRY_RUN),-DryRun,)

.PHONY: help doctor setup run first-run infra-up infra-down test-launcher

help:
	$(POWERSHELL) -NoProfile -ExecutionPolicy Bypass -File "$(PROJECT_SCRIPT)" help

doctor:
	$(POWERSHELL) -NoProfile -ExecutionPolicy Bypass -File "$(PROJECT_SCRIPT)" doctor

setup:
	$(POWERSHELL) -NoProfile -ExecutionPolicy Bypass -File "$(PROJECT_SCRIPT)" setup $(DRY_RUN_FLAG)

run:
	$(POWERSHELL) -NoProfile -ExecutionPolicy Bypass -File "$(PROJECT_SCRIPT)" run $(DRY_RUN_FLAG)

first-run:
	$(POWERSHELL) -NoProfile -ExecutionPolicy Bypass -File "$(PROJECT_SCRIPT)" first-run $(DRY_RUN_FLAG)

infra-up:
	$(POWERSHELL) -NoProfile -ExecutionPolicy Bypass -File "$(PROJECT_SCRIPT)" infra-up $(DRY_RUN_FLAG)

infra-down:
	$(POWERSHELL) -NoProfile -ExecutionPolicy Bypass -File "$(PROJECT_SCRIPT)" infra-down $(DRY_RUN_FLAG)

test-launcher:
	$(POWERSHELL) -NoProfile -ExecutionPolicy Bypass -File ".\scripts\tests\project-launcher.tests.ps1"
