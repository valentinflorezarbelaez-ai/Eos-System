#!/bin/bash
awk '/generateHypotheses\(failureContext = \{\}\) \{/{flag=1} /^\s*return hypotheses;/{print; flag=0; next} flag' src/core/resilience/fdir-self-healing-engine.js
