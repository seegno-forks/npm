var url = require('url')

var log = require('npmlog')
var npa = require('npm-package-arg')

module.exports = mapToRegistry

function loadSslConfig (config, scope) {
  function get (name, defaultValue) {
    return config.get(scope ? scope + ':' + name : name) || config.get(name) || defaultValue
  }

  return {
    certificate: get('cert', null),
    key: get('key', null),
    ca: get('ca', null),
    strict: get('strict-ssl', true)
  }
}

function mapToRegistry (name, config, cb) {
  log.silly('mapToRegistry', 'name', name)
  var registry
  var ssl
  var scope

  // the name itself takes precedence
  var data = npa(name)
  if (data.scope) {
    scope = data.scope

    // the name is definitely scoped, so escape now
    name = name.replace('/', '%2f')

    log.silly('mapToRegistry', 'scope (from package name)', scope)

    registry = config.get(scope + ':registry')
    if (!registry) {
      log.verbose('mapToRegistry', 'no registry URL found in name for scope', scope)
    }
  }

  // ...then --scope=@scope or --scope=scope
  if (!registry && config.get('scope')) {
    scope = config.get('scope')

    // I'm an enabler, sorry
    if (scope.charAt(0) !== '@') scope = '@' + scope

    log.silly('mapToRegistry', 'scope (from config)', scope)

    registry = config.get(scope + ':registry')
    if (!registry) {
      log.verbose('mapToRegistry', 'no registry URL found in config for scope', scope)
    }
  }

  // ...and finally use the default registry
  if (!registry) {
    log.silly('mapToRegistry', 'using default registry')
    registry = config.get('registry')
  }

  log.silly('mapToRegistry', 'registry', registry)

  var auth = config.getCredentialsByURI(registry)

  auth.ssl = loadSslConfig(config, scope)

  // normalize registry URL so resolution doesn't drop a piece of registry URL
  var normalized = registry.slice(-1) !== '/' ? registry + '/' : registry
  var uri = url.resolve(normalized, name)
  log.silly('mapToRegistry', 'uri', uri)

  cb(null, uri, auth, normalized)
}
