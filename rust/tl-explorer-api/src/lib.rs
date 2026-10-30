//! Contract layer of tl-explorer (an Angular client): the backend endpoints it calls,
//! its page routes, the property-name → link rules and the mock API's file mapping.
//!
//! The legacy client interpolated raw strings into URL paths and router links. Here
//! every parameter is a validated type, so a built path or link always has exactly the
//! intended segments. No HTTP client or server is included.
#![forbid(unsafe_code)]

use std::fmt;

pub const MAX_ADDRESS: usize = 128;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Error {
    BadAddress,
    BadTxid,
    BadNumber,
    BadRange,
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{self:?}")
    }
}
impl std::error::Error for Error {}

/// Base58/bech32 address text: ASCII alphanumeric only, 1..=128 bytes. The backend
/// decides validity; this only guarantees the value is a single safe path segment.
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct Address(String);

impl Address {
    pub fn parse(s: &str) -> Result<Self, Error> {
        if s.is_empty() || s.len() > MAX_ADDRESS || !s.bytes().all(|b| b.is_ascii_alphanumeric()) {
            return Err(Error::BadAddress);
        }
        Ok(Self(s.to_owned()))
    }
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

/// 64 hex digits, normalized to lowercase.
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct Txid(String);

impl Txid {
    pub fn parse(s: &str) -> Result<Self, Error> {
        if s.len() != 64 || !s.bytes().all(|b| b.is_ascii_hexdigit()) {
            return Err(Error::BadTxid);
        }
        Ok(Self(s.to_ascii_lowercase()))
    }
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

/// Canonical unsigned decimal (no sign, no leading zeros, no exponent). The legacy
/// `parseInt` accepted prefixes such as `12abc`.
pub fn parse_u64(s: &str) -> Result<u64, Error> {
    if s.is_empty()
        || s.len() > 20
        || !s.bytes().all(|b| b.is_ascii_digit())
        || (s.len() > 1 && s.starts_with('0'))
    {
        return Err(Error::BadNumber);
    }
    s.parse().map_err(|_| Error::BadNumber)
}

/// `PropertyCacheType` (the legacy request ignored it; kept for the contract).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PropertyCacheType {
    NativeFees = 0,
    OracleFees = 1,
    SpotFees = 2,
    Total = 3,
}

/// Every backend call made by `TradeLayerApi` (src/app/@core/api/tl-api.service.ts).
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Endpoint {
    ValidateAddress(Address),
    Balance(Address),
    UnvestedBalance(Address),
    Properties,
    Property(u64),
    PropertyCurrencyTotal(u64),
    PropertyCache(u64, PropertyCacheType),
    PropertyVestingInfo(u64),
    PropertyLtcVolume { id: u64, start: u64, end: u64 },
    Contract(u64),
    ContractOpenInterest(u64),
    ContractTradeHistory(u64),
    ContractTradeHistoryUnfiltered(u64),
    NativeContracts,
    OracleContracts,
    ChainInfo,
    Top10Blocks,
    Transaction(Txid),
    TransactionsForAddress(Address),
    TransactionsForBlock(u64),
}

impl Endpoint {
    pub fn ltc_volume(id: u64, start: u64, end: u64) -> Result<Self, Error> {
        if start > end {
            return Err(Error::BadRange);
        }
        Ok(Endpoint::PropertyLtcVolume { id, start, end })
    }

    /// Request path relative to `environment.apiUrl`, byte-identical to the legacy
    /// template for valid parameters.
    pub fn path(&self) -> String {
        match self {
            Endpoint::ValidateAddress(a) => format!("/addresses/{}/validate/", a.as_str()),
            Endpoint::Balance(a) => format!("/tl_getAllBalancesForAddress/{}", a.as_str()),
            Endpoint::UnvestedBalance(a) => {
                format!("/addresses/{}/unvested_balance", a.as_str())
            }
            Endpoint::Properties => "/tl_listproperties".into(),
            Endpoint::Property(id) => format!("/tl_getproperty/{id}"),
            Endpoint::PropertyCurrencyTotal(id) => format!("/token/{id}/currency_total"),
            Endpoint::PropertyCache(id, _) => format!("/tl_propertyFeeCache/{id}"),
            Endpoint::PropertyVestingInfo(id) => format!("/token/{id}/vesting_info"),
            Endpoint::PropertyLtcVolume { id, start, end } => {
                format!("/token/{id}/ltc_volume?startBlock={start}&endBlock={end}")
            }
            Endpoint::Contract(id) => format!("/contracts/{id}"),
            Endpoint::ContractOpenInterest(id) => format!("/contracts/{id}/open_interest"),
            Endpoint::ContractTradeHistory(id) => format!("/contracts/{id}/trade_history"),
            Endpoint::ContractTradeHistoryUnfiltered(id) => {
                format!("/contracts/{id}/trade_history_unfiltered")
            }
            Endpoint::NativeContracts => "/contracts/natives".into(),
            Endpoint::OracleContracts => "/tl_listoracles".into(),
            Endpoint::ChainInfo => "/tl_getchaininfo".into(),
            Endpoint::Top10Blocks => "/tl_gettop10blocks".into(),
            Endpoint::Transaction(t) => format!("/tl_gettransaction/{}", t.as_str()),
            Endpoint::TransactionsForAddress(a) => {
                format!("/tl_gettransactionsforaddress/{}", a.as_str())
            }
            Endpoint::TransactionsForBlock(b) => format!("/tl_gettransactionsforblock/{b}"),
        }
    }
}

/// Client-side pages (src/app/app-routing.module.ts).
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Page {
    Home,
    Address(Address),
    Block(u64),
    LastWinners,
    Tx(Txid),
    Property(u64),
    Contract(u64),
}

impl Page {
    pub fn segments(&self) -> Vec<String> {
        match self {
            Page::Home => vec![],
            Page::Address(a) => vec!["addresses".into(), a.as_str().into()],
            Page::Block(b) => vec!["blocks".into(), b.to_string()],
            Page::LastWinners => vec!["last-winners".into()],
            Page::Tx(t) => vec!["tx".into(), t.as_str().into()],
            Page::Property(p) => vec!["properties".into(), p.to_string()],
            Page::Contract(c) => vec!["contracts".into(), c.to_string()],
        }
    }

    pub fn path(&self) -> String {
        format!("/{}", self.segments().join("/"))
    }

    /// Route matching; anything else is the `**` error page (`None`).
    pub fn parse(path: &str) -> Option<Self> {
        let path = path.strip_prefix('/')?;
        let segs: Vec<&str> = if path.is_empty() {
            vec![]
        } else {
            path.split('/').collect()
        };
        match segs.as_slice() {
            [] => Some(Page::Home),
            ["addresses", a] => Address::parse(a).ok().map(Page::Address),
            ["blocks", b] => parse_u64(b).ok().map(Page::Block),
            ["last-winners"] => Some(Page::LastWinners),
            ["tx", t] => Txid::parse(t).ok().map(Page::Tx),
            ["properties", p] => parse_u64(p).ok().map(Page::Property),
            ["contracts", c] => parse_u64(c).ok().map(Page::Contract),
            _ => None,
        }
    }
}

/// `AppComponent.search`. Legacy: length 64 → tx, else `parseInt` prefix → block, else
/// address; so an address starting with a digit (e.g. `3J98…`) went to block 3.
pub fn search(value: &str) -> Option<Page> {
    let v = value.trim();
    if let Ok(t) = Txid::parse(v) {
        return Some(Page::Tx(t));
    }
    if let Ok(b) = parse_u64(v) {
        return Some(Page::Block(b));
    }
    Address::parse(v).ok().map(Page::Address)
}

/// `property-types.ts` link kinds.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum LinkType {
    Blocks,
    Address,
    Contract,
    Url,
    Transaction,
    Property,
}

/// `PropertyToPropertyType`: which response fields are rendered as links.
pub fn link_type_of(property: &str) -> Option<LinkType> {
    match property {
        "issuer" => Some(LinkType::Address),
        "url" => Some(LinkType::Url),
        "creationtxid" => Some(LinkType::Transaction),
        "propertyid" => Some(LinkType::Property),
        "blockid" => Some(LinkType::Blocks),
        _ => None,
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Link {
    Internal(Page),
    /// `target="_blank"`; render with `rel="noopener noreferrer"`.
    External(String),
}

/// `getLinkFromPropertyType` + `PossibleLinkComponent`. Legacy built router links from
/// raw values (a `contract` link could be any string) and rendered `url` values as
/// `value.startsWith('http') ? value : 'https://' + value` with `target=_blank` and no
/// `rel`. Here internal links require a valid page parameter and external links must
/// be plain http(s) URLs; otherwise there is no link.
pub fn link_for(kind: LinkType, value: &str) -> Option<Link> {
    let page = match kind {
        LinkType::Blocks => Page::Block(parse_u64(value).ok()?),
        LinkType::Address => Page::Address(Address::parse(value).ok()?),
        LinkType::Contract => Page::Contract(parse_u64(value).ok()?),
        LinkType::Transaction => Page::Tx(Txid::parse(value).ok()?),
        LinkType::Property => Page::Property(parse_u64(value).ok()?),
        LinkType::Url => return external_href(value).map(Link::External),
    };
    Some(Link::Internal(page))
}

fn host_ok(h: &str) -> bool {
    !h.is_empty()
        && h.len() <= 253
        && h.contains('.')
        && !h.starts_with('.')
        && !h.ends_with('.')
        && h.bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'.' || b == b'-')
}

/// An http(s) URL with a DNS host, or a bare host/path that gets `https://`.
pub fn external_href(value: &str) -> Option<String> {
    let v = value.trim();
    if v.len() > 2048
        || v.bytes()
            .any(|b| b <= b' ' || b == b'"' || b == b'<' || b == b'>' || b == b'\\')
    {
        return None;
    }
    let (scheme, rest) = match v.split_once("://") {
        Some((s, r)) => (s.to_ascii_lowercase(), r),
        None => {
            if v.contains(':') {
                return None; // javascript:, data:, mailto:, host:port without scheme
            }
            ("https".to_string(), v)
        }
    };
    if scheme != "http" && scheme != "https" {
        return None;
    }
    let host_end = rest.find(['/', '?', '#']).unwrap_or(rest.len());
    let host = &rest[..host_end];
    if host.contains('@') || !host_ok(host) {
        return None;
    }
    Some(format!("{scheme}://{rest}"))
}

/// `mock-api/server.js` file mapping: `__dirname + '/data' + path`, query stripped,
/// `.json` appended. Legacy did no traversal check, so `/../../x` escaped `data/`.
/// Returns the path relative to `data/`, or `None`.
pub fn mock_file(url_path: &str) -> Option<String> {
    let path = url_path.split(['?', '#']).next()?;
    let rel = path.strip_prefix('/')?;
    if rel.is_empty() || rel.len() > 512 {
        return None;
    }
    for seg in rel.split('/') {
        if seg.is_empty()
            || seg == "."
            || seg == ".."
            || !seg
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-' || b == b'.')
        {
            return None;
        }
    }
    Some(if rel.ends_with(".json") {
        rel.to_owned()
    } else {
        format!("{rel}.json")
    })
}
