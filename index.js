"use strict"

let cluster = require("./cluster")

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

let clusters = [
    new cluster.Cluster("10.63.30.105"),
    new cluster.Cluster("10.63.30.110"),
    new cluster.Cluster("10.63.30.115"),
    new cluster.Cluster("10.63.4.213"),
    new cluster.Cluster("10.64.200.100")
]

cluster.add_node_calls([
    {name: "hypervisor", path: ["hypervisor_full_name"]},
    {name: "name", path: ["name"]},
    {name: "cvmip", path: ["service_vmexternal_ip"]},
    {name: "hostip", path: ["hypervisor_address"]},
    {name: "ipmiip", path: ["ipmi_address"]}
])

cluster.add_cluster_call({
    path: "PrismGateway/services/rest/v1/storage_pools",
    stats:[
        {name: "storagePools", path: ["metadata", "count"]}
    ]
})
cluster.add_cluster_call({
    path: "PrismGateway/services/rest/v1/containers",
    stats:[
        {name: "containers", path: ["metadata", "count"]}
    ]
})
cluster.add_cluster_call({
    path: "PrismGateway/services/rest/v1/cluster",
    stats: [
        {name: "memory", path: ["stats", "hypervisor_memory_usage_ppm"]},
        {name: "iops", path: ["stats", "controller_num_iops"]},
        {name: "usedStorage", path: ["usageStats", "storage.usage_bytes"]}
    ]
})

cluster.collect_stats(clusters, 2, 2, () => {
    console.log(clusters)
})
