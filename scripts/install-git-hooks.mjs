#!/usr/bin/env node
import {execSync} from 'node:child_process'

execSync('git config core.hooksPath .githooks', {stdio: 'inherit'})
execSync('chmod +x .githooks/pre-push', {stdio: 'inherit'})
console.log('Git hooks installed: core.hooksPath=.githooks')
