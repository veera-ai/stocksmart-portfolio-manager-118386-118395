#!/bin/bash
cd /home/kavia/workspace/code-generation/stocksmart-portfolio-manager-118386-118395/stock_portfolio_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

