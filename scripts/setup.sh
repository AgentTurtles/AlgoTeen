#!/bin/bash

# Perfect Efficient Database Setup Script for AlgoTeen
# This script combines all SQL files into one for easy execution.
# Copy the output and run it in your Supabase SQL editor.

set -e

echo "AlgoTeen Database Setup SQL"
echo "============================"
echo ""
echo "-- Copy everything below this line into your Supabase SQL editor"
echo ""

# Output the combined SQL
cat scripts/setup-database.sql

echo ""
echo "============================"
echo "Run the above SQL in your Supabase dashboard's SQL editor."
echo "This creates all necessary tables with proper relationships and indexes."