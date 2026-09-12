#!/bin/bash
awk '/resetSafeMode\(hitlReceipt = \{\}\) \{/{flag=1} /^\s*return \{/{print; getline; print; getline; print; getline; print; getline; print; getline; print; flag=0; next} flag' src/core/resilience/fdir-self-healing-engine.js
