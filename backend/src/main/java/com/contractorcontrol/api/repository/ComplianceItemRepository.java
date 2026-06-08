package com.contractorcontrol.api.repository;

import com.contractorcontrol.api.entity.ComplianceItemEntity;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ComplianceItemRepository extends JpaRepository<ComplianceItemEntity, String>, JpaSpecificationExecutor<ComplianceItemEntity> {

  List<ComplianceItemEntity> findByExpiryDateBetween(Instant start, Instant end, Sort sort);

  long countByExpiryDateBetween(Instant start, Instant end);

  List<ComplianceItemEntity> findByVendorId(String vendorId);

  List<ComplianceItemEntity> findByVendorIdAndExpiryDateBefore(String vendorId, Instant date);

  List<ComplianceItemEntity> findByVendorIdAndExpiryDateBetween(String vendorId, Instant start, Instant end);
}
