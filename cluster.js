"use strict"

const dotenv = require("dotenv").config()
const axios = require("axios")
const parallel = require("async-parallel")

function traverse_api_path(haystack, needle) {
    if (needle.length == 1) return haystack[needle]
    return traverse_api_path(haystack[needle.shift()], needle)
}

const cluster_calls = []
const node_calls = []

class Cluster {
    constructor(external_ip) {
        this.ip = external_ip
        this.hosts = []
    }

    _get_api(suffix) {
        console.log("%s: get_api for %s", this.ip, suffix)

        return axios({
            method: "get",
            url: "https://" + this.ip + ":9440/" + suffix,
            responseType: "json",
            timeout: 10000,
            auth: {
                username: process.env.CLUSTER_USERNAME,
                password: process.env.CLUSTER_PASSWORD
            }
        })
    }

    async get_info(max_api) {
        console.log("%s: starting get_info", this.ip)

        try {
            // wait for host information
            const hosts = await this._get_api("api/nutanix/v2.0/hosts")

            // parse hosts information
            hosts.data.entities.map(host => {
                const cur_host = {}

                // iterate over every host-level stat
                node_calls.map(call => {
                    const name = call.name
                    const path = call.path.slice()

                    cur_host[name] = traverse_api_path(host, path)
                })

                this.hosts.push(cur_host)
            })

            // wait for all cluster API information
            await parallel.map(cluster_calls, async call => {
                const result = await this._get_api(call.path)

                // iterate over every stat this API needs
                call.stats.map(stat => {
                    const name = stat.name
                    const path = stat.path.slice()

                    this[name] = traverse_api_path(result.data, path)
                })
            }, max_api)

        } catch (e) {
            console.error(e)
        }
    }
}

async function collect_stats(clusters, max_cluster, max_api, callback) {
    try {
        await parallel.map(clusters, async item => {
            await item.get_info(max_api)
        }, max_cluster)

        callback()
    } catch (e) {
        console.error(e)
    }
}

module.exports.Cluster = Cluster
module.exports.collect_stats = collect_stats

module.exports.add_cluster_call = call => cluster_calls.push(call)
module.exports.add_cluster_calls = calls => cluster_calls.push(...calls)
module.exports.add_node_call = call => node_calls.push(call)
module.exports.add_node_calls = calls => node_calls.push(...calls)
