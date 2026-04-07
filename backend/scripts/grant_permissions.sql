-- Databricks notebook source

GRANT USE CATALOG ON CATALOG system TO <group_name>

-- COMMAND ----------

GRANT USE SCHEMA ON SCHEMA system.access TO <group_name>

-- COMMAND ----------

GRANT SELECT ON TABLE system.access.column_lineage TO <group_name>