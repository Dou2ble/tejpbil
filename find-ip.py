#!/usr/bin/env python3

import requests;

for i in range(0, 256):
    try:
        r = requests.get(f'http://192.168.101.{i}', timeout=0.5)
        print(f'192.168.101.{i} is up')
    except:
        print(f'192.168.101.{i} is down')


