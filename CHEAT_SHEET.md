# GameDay World Championship 2022 に向けて ECS を触っていたときのメモ

## ECS Exec

```
aws ecs execute-command --region ap-northeast-1 --cluster [クラスター名] --task [タスク ID] --container [コンテナ名] --interactive --command "/bin/bash"
```

## 標準出力するコンテナアプリを標準の firelens で CloudWachLogs に転送する

アプリケーションコンテナの Logconfiguration に Option を指定しないと CloudWachLogs に転送してくれないという仕様で、どのサービスに転送するかで指定する Option が異なるのだが、そのリファレンスが公式ドキュメントになく（見つからなかった）GitHub にある

[GitHub の Example](https://github.com/aws-samples/amazon-ecs-firelens-examples/tree/mainline/examples/fluent-bit)

見ていると fluentbit の config で指定できるパラメータを Option に指定できる感じで、指定しないといけない。

こっちを見るといいかも

[fluentbit で CloudWatchLogs に転送する場合に指定可能なオプション](https://docs.fluentbit.io/manual/pipeline/outputs/cloudwatch)

実際に指定は CDK だとこんな感じ

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

## CloudWatchLogs Insgiht

firelens を使用していると CloudWatchLogs に転送されてくるログは JSON 形式でメタデータが付与されており、
container_id や container_name、ecs_cluster などがあるので、これらを使ってクエリをしやすいようになっている

カスタムした fluentbit の conf を使用した firelens でも同様

- [CloudWatch Logs Insights でログを調査する前に読む記事](https://dev.classmethod.jp/articles/how-to-cloudwatch-logs-insights)

クエリ種類を Lambda のログを用いて説明していくれている良記事

- [サンプルの構文が載っている AWS 公式](https://docs.aws.amazon.com/ja_jp/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-examples.html)
