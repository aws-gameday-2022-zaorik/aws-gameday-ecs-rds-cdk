# GameDay World Championship 2022に向けてECSを触っていたときのメモ

## 標準出力するコンテナアプリを標準のfirelensでCloudWachLogsに転送する

アプリケーションコンテナのLogconfigurationにOptionを指定しないとCloudWachLogsに転送してくれないという仕様で、どのサービスに転送するかで指定するOptionが異なるのだが、そのリファレンスが公式ドキュメントになく（見つからなかった）GitHubにある

[GitHubのExample](https://github.com/aws-samples/amazon-ecs-firelens-examples/tree/mainline/examples/fluent-bit)

見ているとfluentbitのconfigで指定できるパラメータをOptionに指定できる感じで、指定しないといけない。

こっちを見るといいかも

[fluentbitでCloudWatchLogsに転送する場合に指定可能なオプション](https://docs.fluentbit.io/manual/pipeline/outputs/cloudwatch)

実際に指定はCDKだとこんな感じ

```
const taskDef =  new FargateTaskDefinition(this, 'taskDefinition', {})
taskDef.addContainer('app-container', {
    containerName: this.appContainerName,
    image: ContainerImage.fromDockerImageAsset(new DockerImageAsset(this, 'nginx-stdout',{
        directory: join(resolve(__dirname, '../'), 'nginx')
    })),
    logging: LogDrivers.firelens({
        options: {
            "Name": 'cloudwatch',
            "log_group_name": 'hisama-nginx-from-firelens',
            "log_stream_prefix": "from-app",
            "auto_create_group": "true",
            "region": this.region
        }
    }),
    portMappings: [
        {containerPort: 80}
    ]
})
```