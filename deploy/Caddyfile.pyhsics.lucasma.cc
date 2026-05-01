pyhsics.lucasma.cc {
  encode zstd gzip

  @backend path /api/* /colyseus/*
  reverse_proxy @backend host.docker.internal:2568

  reverse_proxy host.docker.internal:4174

  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options "nosniff"
    X-Frame-Options "SAMEORIGIN"
    Referrer-Policy "strict-origin-when-cross-origin"
  }
}
