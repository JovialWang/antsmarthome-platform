# Antsmarthome-homebridge-plugin

本插件可以支持“普及e家”、“小蚁智家”、“哈奇智家”3个app的智能家居，这3个app都访问到一个后端应用，且协议也一致，且均是通过app向云端发送指令，在通过云端向家里的网关发送指令实现对设备的控制。
项目中smarthome-0.0.1-SNAPSHOT.jar是通过反编译小蚁智家后编写而来，这个jar就担任homekit指令到云端的代理。homekit指令实际上会先发给这个java应用，再由java应用转发到云端。

![https://github.com/JovialWang/resource/blob/master/IMG_0A4740A37491-1.jpeg?raw=true](https://github.com/JovialWang/resource/blob/master/IMG_0A4740A37491-1.jpeg?raw=true)

## 环境依赖

- Java环境：JRE 8以上
- Homebridge

## 安装配置

Homebridge的安装过程可以参考其官方文档：[https://github.com/nfarina/homebridge#installation](https://github.com/nfarina/homebridge#installation)

Homebridge安装完成后可以开始安装本插件
```
git clone https://github.com/JovialWang/antsmarthome-platform.git
```

进入你的homebridge路径，安装插件
```
npm install ${yourpath}/antsmarthome-platform
```

其中`${yourpath}`需要替换为你的文件路径

安装完成后，需要对于插件进行配置，配置文件位于homebridge根目录的config.json文件

```JSON
{
  ...
  "platforms": [
    {
      "platform": "AntSmartHomePlatform",
      "smarthome": {
        "host": "${hostname}"
      }
    }
  ]
}
```

注意替换其中`${hostname}`为你后面执行smarthome-0.0.1-SNAPSHOT.jar的机器地址，如果你的smarthome-0.0.1-SNAPSHOT.jar和homebridge在同一台机器上执行，那么可以写当前机器地址。

## 启动服务

以上配置完成后可以开始执行启动命令，首先需要启动smarthome-0.0.1-SNAPSHOT.jar这个Java应用。

启动方式：
```
java -jar smarthome-0.0.1-SNAPSHOT.jar ${username} ${password} ${hostname}
```

其中`${username}`为你手机登陆“普及e家”、“小蚁智家”、“哈奇智家”这3个应用的用户名称，一般应该是你的注册手机号，`${password}`为你的登陆密码。`${hostname}`为你的homebridge所在的机器地址。同样，如果你的smarthome-0.0.1-SNAPSHOT.jar和homebridge在同一台机器上执行，那么可以写当前机器地址。

应用启动后，再启动homebridge，应该可以看到所有的家庭设备了。
