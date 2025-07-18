# Jenkins Jobs for Cloudflare DNS A Records

This repository contains a collection of Jenkins pipeline jobs (Jenkinsfiles) that make it easy to manage Cloudflare DNS A records.  
With these automated jobs, you can add, update, delete, or list A-type DNS records in your Cloudflare zones directly from Jenkins.

Simply choose the Jenkinsfile you need, configure it with your Cloudflare credentials and desired parameters, and run DNS operations as part of your CI/CD workflow.



| Jenkinsfile Name                  | What it Does                                                   | How it Works Briefly                                                                             | Input Format                                   |
|-----------------------------------|----------------------------------------------------------------|--------------------------------------------------------------------------------------------------|------------------------------------------------|
| Jenkinsfile.AddOrUpdateARecord    | Add or update A records in Cloudflare                          | Creates or updates one or more specified A records with a given IP address.                      | Accepts a single A record or multiple, comma-separated (e.g. `www.example.com,api.example.com`).|
| Jenkinsfile.DeleteRecords         | Delete A records from Cloudflare                               | Removes one or more specified A records by name from your zone.                                  | Accepts a single A record or multiple, comma-separated.                             |
| Jenkinsfile.ListRecords           | List all Cloudflare A records                                  | Fetches and displays all current A records for your Cloudflare zone.                             | No record name input needed.                   |