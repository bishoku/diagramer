import React from 'react';
import {
  // Cache
  RedisOriginal, RedisPlain, RedisOriginalWordmark, RedisPlainWordmark,
  MemcachedOriginal, MemcachedPlain, MemcachedOriginalWordmark, MemcachedPlainWordmark,
  
  // Database
  PostgresqlOriginal, PostgresqlPlain, PostgresqlOriginalWordmark, PostgresqlPlainWordmark,
  MysqlOriginal, MysqlPlainWordmark, MysqlOriginalWordmark,
  OracleOriginal,
  MongodbOriginal, MongodbPlain, MongodbOriginalWordmark, MongodbPlainWordmark,
  CassandraOriginal, CassandraPlain, CassandraOriginalWordmark, CassandraPlainWordmark,
  SqliteOriginal, SqlitePlain, SqliteOriginalWordmark, SqlitePlainWordmark,
  MariadbOriginal, MariadbOriginalWordmark,
  
  // Server / Languages
  NodejsOriginal, NodejsPlain, NodejsOriginalWordmark, NodejsPlainWordmark,
  SpringOriginal, SpringOriginalWordmark,
  PythonOriginal, PythonPlain, PythonOriginalWordmark, PythonPlainWordmark,
  GoOriginal, GoPlain, GoOriginalWordmark,
  JavaOriginal, JavaPlain, JavaOriginalWordmark, JavaPlainWordmark,
  DotNetOriginal, DotNetPlain, DotNetOriginalWordmark, DotNetPlainWordmark,
  CsharpOriginal, CsharpPlain,
  PhpOriginal, PhpPlain,
  RubyOriginal, RubyPlain, RubyOriginalWordmark, RubyPlainWordmark,
  RailsPlain, RailsOriginalWordmark, RailsPlainWordmark,
  RustOriginal,
  
  // Queue
  RabbitmqOriginal, RabbitmqOriginalWordmark, RabbitmqPlainWordmark,
  ApachekafkaOriginal, ApachekafkaOriginalWordmark,
  
  // Clients
  ChromeOriginal, ChromePlain, ChromeOriginalWordmark, ChromePlainWordmark,
  AndroidOriginal, AndroidPlain, AndroidOriginalWordmark, AndroidPlainWordmark,
  FirefoxOriginal, FirefoxPlain, FirefoxOriginalWordmark, FirefoxPlainWordmark,
  SafariOriginal, SafariPlain, SafariOriginalWordmark, SafariPlainWordmark,
  AppleOriginal,
  Windows11Original, Windows11OriginalWordmark,
  LinuxOriginal, LinuxPlain,
  
  // Load Balancer / Gateway
  NginxOriginal,
  EnvoyOriginal, EnvoyPlain, EnvoyOriginalWordmark, EnvoyPlainWordmark,
  TraefikproxyOriginal, TraefikproxyOriginalWordmark, TraefikproxyPlainWordmark,
  
  // Cloud & Infrastructure
  AmazonwebservicesOriginalWordmark, AmazonwebservicesPlainWordmark,
  GooglecloudOriginal, GooglecloudPlain, GooglecloudOriginalWordmark, GooglecloudPlainWordmark,
  AzureOriginal, AzurePlain, AzureOriginalWordmark, AzurePlainWordmark,
  DockerOriginal, DockerPlain, DockerOriginalWordmark, DockerPlainWordmark,
  KubernetesOriginal, KubernetesPlain, KubernetesOriginalWordmark, KubernetesPlainWordmark,
  
  // Firewall / WAF / Security
  CloudflareOriginal, CloudflarePlain, CloudflareOriginalWordmark, CloudflarePlainWordmark,
  
  // Other / Frontend / Studio / Tooling
  GraphqlPlain, GraphqlPlainWordmark,
  ApollographqlOriginal, ApollographqlOriginalWordmark,
  PrometheusOriginal, PrometheusOriginalWordmark,
  GrafanaOriginal, GrafanaPlain, GrafanaOriginalWordmark, GrafanaPlainWordmark,
  ElasticsearchOriginal, ElasticsearchPlain, ElasticsearchOriginalWordmark, ElasticsearchPlainWordmark,
  KibanaOriginal, KibanaPlain, KibanaOriginalWordmark, KibanaPlainWordmark,
  FirebaseOriginal, FirebasePlain, FirebaseOriginalWordmark, FirebasePlainWordmark,
  SupabaseOriginal, SupabasePlain, SupabaseOriginalWordmark, SupabasePlainWordmark,
  PrismaOriginal, PrismaOriginalWordmark
} from 'devicons-react';

export interface DeviconItem {
  id: string;
  name: string;
  components: {
    colored?: React.ComponentType<any>;
    plain?: React.ComponentType<any>;
    coloredWordmark?: React.ComponentType<any>;
    plainWordmark?: React.ComponentType<any>;
  };
}

export const DeviconRegistry: Record<string, DeviconItem[]> = {
  client: [
    {
      id: 'chrome',
      name: 'Chrome',
      components: {
        colored: ChromeOriginal,
        plain: ChromePlain,
        coloredWordmark: ChromeOriginalWordmark,
        plainWordmark: ChromePlainWordmark,
      }
    },
    {
      id: 'android',
      name: 'Android',
      components: {
        colored: AndroidOriginal,
        plain: AndroidPlain,
        coloredWordmark: AndroidOriginalWordmark,
        plainWordmark: AndroidPlainWordmark,
      }
    },
    {
      id: 'apple',
      name: 'Apple iOS / Mac',
      components: {
        colored: AppleOriginal,
        plain: AppleOriginal, // Fallback
      }
    },
    {
      id: 'windows',
      name: 'Windows',
      components: {
        colored: Windows11Original,
        plain: Windows11Original,
        coloredWordmark: Windows11OriginalWordmark,
        plainWordmark: Windows11OriginalWordmark,
      }
    },
    {
      id: 'linux',
      name: 'Linux',
      components: {
        colored: LinuxOriginal,
        plain: LinuxPlain,
      }
    },
    {
      id: 'firefox',
      name: 'Firefox',
      components: {
        colored: FirefoxOriginal,
        plain: FirefoxPlain,
        coloredWordmark: FirefoxOriginalWordmark,
        plainWordmark: FirefoxPlainWordmark,
      }
    },
    {
      id: 'safari',
      name: 'Safari',
      components: {
        colored: SafariOriginal,
        plain: SafariPlain,
        coloredWordmark: SafariOriginalWordmark,
        plainWordmark: SafariPlainWordmark,
      }
    }
  ],
  load_balancer: [
    {
      id: 'nginx',
      name: 'Nginx',
      components: {
        colored: NginxOriginal,
        plain: NginxOriginal,
      }
    },
    {
      id: 'traefik',
      name: 'Traefik Proxy',
      components: {
        colored: TraefikproxyOriginal,
        plain: TraefikproxyOriginal,
        coloredWordmark: TraefikproxyOriginalWordmark,
        plainWordmark: TraefikproxyPlainWordmark,
      }
    }
  ],
  gateway: [
    {
      id: 'envoy',
      name: 'Envoy',
      components: {
        colored: EnvoyOriginal,
        plain: EnvoyPlain,
        coloredWordmark: EnvoyOriginalWordmark,
        plainWordmark: EnvoyPlainWordmark,
      }
    },
    {
      id: 'nginx',
      name: 'Nginx',
      components: {
        colored: NginxOriginal,
        plain: NginxOriginal,
      }
    },
    {
      id: 'traefik',
      name: 'Traefik Proxy',
      components: {
        colored: TraefikproxyOriginal,
        plain: TraefikproxyOriginal,
        coloredWordmark: TraefikproxyOriginalWordmark,
        plainWordmark: TraefikproxyPlainWordmark,
      }
    }
  ],
  server: [
    {
      id: 'nodejs',
      name: 'Node.js',
      components: {
        colored: NodejsOriginal,
        plain: NodejsPlain,
        coloredWordmark: NodejsOriginalWordmark,
        plainWordmark: NodejsPlainWordmark,
      }
    },
    {
      id: 'spring',
      name: 'Spring Boot',
      components: {
        colored: SpringOriginal,
        plain: SpringOriginal,
        coloredWordmark: SpringOriginalWordmark,
        plainWordmark: SpringOriginalWordmark,
      }
    },
    {
      id: 'python',
      name: 'Python',
      components: {
        colored: PythonOriginal,
        plain: PythonPlain,
        coloredWordmark: PythonOriginalWordmark,
        plainWordmark: PythonPlainWordmark,
      }
    },
    {
      id: 'go',
      name: 'Go (Golang)',
      components: {
        colored: GoOriginal,
        plain: GoPlain,
        coloredWordmark: GoOriginalWordmark,
        plainWordmark: GoOriginalWordmark,
      }
    },
    {
      id: 'java',
      name: 'Java',
      components: {
        colored: JavaOriginal,
        plain: JavaPlain,
        coloredWordmark: JavaOriginalWordmark,
        plainWordmark: JavaPlainWordmark,
      }
    },
    {
      id: 'dotnet',
      name: '.NET / C#',
      components: {
        colored: DotNetOriginal,
        plain: DotNetPlain,
        coloredWordmark: DotNetOriginalWordmark,
        plainWordmark: DotNetPlainWordmark,
      }
    },
    {
      id: 'php',
      name: 'PHP',
      components: {
        colored: PhpOriginal,
        plain: PhpPlain,
      }
    },
    {
      id: 'rust',
      name: 'Rust',
      components: {
        colored: RustOriginal,
        plain: RustOriginal,
      }
    },
    {
      id: 'ruby',
      name: 'Ruby',
      components: {
        colored: RubyOriginal,
        plain: RubyPlain,
        coloredWordmark: RubyOriginalWordmark,
        plainWordmark: RubyPlainWordmark,
      }
    },
    {
      id: 'rails',
      name: 'Ruby on Rails',
      components: {
        colored: RailsPlain,
        plain: RailsPlain,
        coloredWordmark: RailsOriginalWordmark,
        plainWordmark: RailsPlainWordmark,
      }
    }
  ],
  database: [
    {
      id: 'postgresql',
      name: 'PostgreSQL',
      components: {
        colored: PostgresqlOriginal,
        plain: PostgresqlPlain,
        coloredWordmark: PostgresqlOriginalWordmark,
        plainWordmark: PostgresqlPlainWordmark,
      }
    },
    {
      id: 'mysql',
      name: 'MySQL',
      components: {
        colored: MysqlOriginal,
        plain: MysqlOriginal, // Fallback
        coloredWordmark: MysqlOriginalWordmark,
        plainWordmark: MysqlPlainWordmark,
      }
    },
    {
      id: 'oracle',
      name: 'Oracle DB',
      components: {
        colored: OracleOriginal,
        plain: OracleOriginal,
      }
    },
    {
      id: 'mongodb',
      name: 'MongoDB',
      components: {
        colored: MongodbOriginal,
        plain: MongodbPlain,
        coloredWordmark: MongodbOriginalWordmark,
        plainWordmark: MongodbPlainWordmark,
      }
    },
    {
      id: 'cassandra',
      name: 'Cassandra',
      components: {
        colored: CassandraOriginal,
        plain: CassandraPlain,
        coloredWordmark: CassandraOriginalWordmark,
        plainWordmark: CassandraPlainWordmark,
      }
    },
    {
      id: 'sqlite',
      name: 'SQLite',
      components: {
        colored: SqliteOriginal,
        plain: SqlitePlain,
        coloredWordmark: SqliteOriginalWordmark,
        plainWordmark: SqlitePlainWordmark,
      }
    },
    {
      id: 'mariadb',
      name: 'MariaDB',
      components: {
        colored: MariadbOriginal,
        plain: MariadbOriginal,
        coloredWordmark: MariadbOriginalWordmark,
        plainWordmark: MariadbOriginalWordmark,
      }
    }
  ],
  cache: [
    {
      id: 'redis',
      name: 'Redis',
      components: {
        colored: RedisOriginal,
        plain: RedisPlain,
        coloredWordmark: RedisOriginalWordmark,
        plainWordmark: RedisPlainWordmark,
      }
    },
    {
      id: 'memcached',
      name: 'Memcached',
      components: {
        colored: MemcachedOriginal,
        plain: MemcachedPlain,
        coloredWordmark: MemcachedOriginalWordmark,
        plainWordmark: MemcachedPlainWordmark,
      }
    }
  ],
  queue: [
    {
      id: 'rabbitmq',
      name: 'RabbitMQ',
      components: {
        colored: RabbitmqOriginal,
        plain: RabbitmqOriginal, // Fallback
        coloredWordmark: RabbitmqOriginalWordmark,
        plainWordmark: RabbitmqPlainWordmark,
      }
    },
    {
      id: 'kafka',
      name: 'Apache Kafka',
      components: {
        colored: ApachekafkaOriginal,
        plain: ApachekafkaOriginal,
        coloredWordmark: ApachekafkaOriginalWordmark,
        plainWordmark: ApachekafkaOriginalWordmark,
      }
    }
  ],
  firewall: [
    {
      id: 'cloudflare',
      name: 'Cloudflare',
      components: {
        colored: CloudflareOriginal,
        plain: CloudflarePlain,
        coloredWordmark: CloudflareOriginalWordmark,
        plainWordmark: CloudflarePlainWordmark,
      }
    }
  ]
};

// Expose a flat list of all registered devicons for Custom components and search capability
export const allDevicons: DeviconItem[] = [
  ...DeviconRegistry.client,
  ...DeviconRegistry.load_balancer,
  ...DeviconRegistry.gateway,
  ...DeviconRegistry.server,
  ...DeviconRegistry.database,
  ...DeviconRegistry.cache,
  ...DeviconRegistry.queue,
  ...DeviconRegistry.firewall,
  // Add other useful ones not directly mapped to a single built-in node type
  {
    id: 'aws',
    name: 'AWS (Amazon Web Services)',
    components: {
      coloredWordmark: AmazonwebservicesOriginalWordmark,
      plainWordmark: AmazonwebservicesPlainWordmark,
    }
  },
  {
    id: 'gcp',
    name: 'Google Cloud Platform',
    components: {
      colored: GooglecloudOriginal,
      plain: GooglecloudPlain,
      coloredWordmark: GooglecloudOriginalWordmark,
      plainWordmark: GooglecloudPlainWordmark,
    }
  },
  {
    id: 'azure',
    name: 'Microsoft Azure',
    components: {
      colored: AzureOriginal,
      plain: AzurePlain,
      coloredWordmark: AzureOriginalWordmark,
      plainWordmark: AzurePlainWordmark,
    }
  },
  {
    id: 'docker',
    name: 'Docker',
    components: {
      colored: DockerOriginal,
      plain: DockerPlain,
      coloredWordmark: DockerOriginalWordmark,
      plainWordmark: DockerPlainWordmark,
    }
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    components: {
      colored: KubernetesOriginal,
      plain: KubernetesPlain,
      coloredWordmark: KubernetesOriginalWordmark,
      plainWordmark: KubernetesPlainWordmark,
    }
  },
  {
    id: 'csharp',
    name: 'C#',
    components: {
      colored: CsharpOriginal,
      plain: CsharpPlain,
    }
  },
  {
    id: 'graphql',
    name: 'GraphQL',
    components: {
      colored: GraphqlPlain,
      plain: GraphqlPlain,
      coloredWordmark: GraphqlPlainWordmark,
      plainWordmark: GraphqlPlainWordmark,
    }
  },
  {
    id: 'apollo',
    name: 'Apollo GraphQL',
    components: {
      colored: ApollographqlOriginal,
      plain: ApollographqlOriginal,
      coloredWordmark: ApollographqlOriginalWordmark,
      plainWordmark: ApollographqlOriginalWordmark,
    }
  },
  {
    id: 'prometheus',
    name: 'Prometheus',
    components: {
      colored: PrometheusOriginal,
      plain: PrometheusOriginal,
      coloredWordmark: PrometheusOriginalWordmark,
      plainWordmark: PrometheusOriginalWordmark,
    }
  },
  {
    id: 'grafana',
    name: 'Grafana',
    components: {
      colored: GrafanaOriginal,
      plain: GrafanaPlain,
      coloredWordmark: GrafanaOriginalWordmark,
      plainWordmark: GrafanaPlainWordmark,
    }
  },
  {
    id: 'elasticsearch',
    name: 'Elasticsearch',
    components: {
      colored: ElasticsearchOriginal,
      plain: ElasticsearchPlain,
      coloredWordmark: ElasticsearchOriginalWordmark,
      plainWordmark: ElasticsearchPlainWordmark,
    }
  },
  {
    id: 'kibana',
    name: 'Kibana',
    components: {
      colored: KibanaOriginal,
      plain: KibanaPlain,
      coloredWordmark: KibanaOriginalWordmark,
      plainWordmark: KibanaPlainWordmark,
    }
  },
  {
    id: 'firebase',
    name: 'Firebase',
    components: {
      colored: FirebaseOriginal,
      plain: FirebasePlain,
      coloredWordmark: FirebaseOriginalWordmark,
      plainWordmark: FirebasePlainWordmark,
    }
  },
  {
    id: 'supabase',
    name: 'Supabase',
    components: {
      colored: SupabaseOriginal,
      plain: SupabasePlain,
      coloredWordmark: SupabaseOriginalWordmark,
      plainWordmark: SupabasePlainWordmark,
    }
  },
  {
    id: 'prisma',
    name: 'Prisma',
    components: {
      colored: PrismaOriginal,
      plain: PrismaOriginal,
      coloredWordmark: PrismaOriginalWordmark,
      plainWordmark: PrismaOriginalWordmark,
    }
  }
];

// Deduplicate allDevicons list just in case some are mapped twice
export const getUniqueAllDevicons = (): DeviconItem[] => {
  const seen = new Set<string>();
  return allDevicons.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

/**
 * Resolves the appropriate component variant for a DeviconItem based on options
 */
export const getDeviconComponent = (
  item: DeviconItem,
  colored: boolean = true,
  wordmark: boolean = false
): React.ComponentType<any> | null => {
  const { components } = item;
  
  if (wordmark) {
    if (colored && components.coloredWordmark) return components.coloredWordmark;
    if (!colored && components.plainWordmark) return components.plainWordmark;
    // Fallbacks if one is missing
    if (components.coloredWordmark) return components.coloredWordmark;
    if (components.plainWordmark) return components.plainWordmark;
  }
  
  if (colored && components.colored) return components.colored;
  if (!colored && components.plain) return components.plain;
  
  // Ultimate fallbacks
  return components.colored || components.plain || components.coloredWordmark || components.plainWordmark || null;
};

/**
 * Helper to find an item by id
 */
export const findDeviconItem = (id: string): DeviconItem | null => {
  for (const category of Object.values(DeviconRegistry)) {
    const found = category.find(item => item.id === id);
    if (found) return found;
  }
  return allDevicons.find(item => item.id === id) || null;
};
