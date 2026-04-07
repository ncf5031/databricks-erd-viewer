-- Databricks notebook source

GRANT USE CATALOG ON CATALOG system TO dbx_erd_viewer

-- COMMAND ----------

GRANT USE SCHEMA ON SCHEMA system.access TO dbx_erd_viewer

-- COMMAND ----------

GRANT SELECT ON TABLE system.access.column_lineage TO dbx_erd_viewer